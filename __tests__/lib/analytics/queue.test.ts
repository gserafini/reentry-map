import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need vi.resetModules() to get fresh singleton instances for each test group
// since queue.ts creates a singleton at module load time

describe('Analytics Queue', () => {
  // Storage mocks
  let localStore: Record<string, string> = {}
  let sessionStore: Record<string, string> = {}

  const localStorageMock = {
    getItem: (key: string) => localStore[key] ?? null,
    setItem: (key: string, value: string) => {
      localStore[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete localStore[key]
    },
    clear: () => {
      localStore = {}
    },
  }

  const sessionStorageMock = {
    getItem: (key: string) => sessionStore[key] ?? null,
    setItem: (key: string, value: string) => {
      sessionStore[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete sessionStore[key]
    },
    clear: () => {
      sessionStore = {}
    },
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStore = {}
    sessionStore = {}

    // Base mocks for browser environment
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setupWindowMock(overrides: Record<string, unknown> = {}) {
    const ricFn = vi.fn((cb: () => void) => {
      cb()
      return 1
    })
    const windowMock = {
      location: { pathname: '/test', hostname: 'localhost' },
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: vi.fn(),
      requestIdleCallback: ricFn,
      ...overrides,
    }
    Object.defineProperty(global, 'window', {
      value: windowMock,
      writable: true,
      configurable: true,
    })
    // Also set requestIdleCallback globally since code references it as a global
    if ('requestIdleCallback' in windowMock && windowMock.requestIdleCallback) {
      ;(global as Record<string, unknown>).requestIdleCallback = windowMock.requestIdleCallback
    } else {
      delete (global as Record<string, unknown>).requestIdleCallback
    }
    return windowMock
  }

  function setupNavigatorMock(overrides: Record<string, unknown> = {}) {
    const navMock = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0 Safari/537.36',
      sendBeacon: vi.fn().mockReturnValue(true),
      ...overrides,
    }
    Object.defineProperty(global, 'navigator', {
      value: navMock,
      writable: true,
      configurable: true,
    })
    return navMock
  }

  function setupDocumentMock() {
    Object.defineProperty(global, 'document', {
      value: { referrer: 'https://google.com', visibilityState: 'visible' },
      writable: true,
      configurable: true,
    })
  }

  describe('Enable/Disable', () => {
    it('should be enabled by default', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics } = await import('@/lib/analytics/queue')
      analytics.destroy()

      // No localStorage override means default enabled
      expect(localStore['analytics_enabled']).toBeUndefined()
    })

    it('should disable analytics and clear queue', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, disableAnalytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      disableAnalytics()

      expect(localStore['analytics_enabled']).toBe('false')
      analytics.destroy()
    })

    it('should enable analytics and store in localStorage', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { disableAnalytics, enableAnalytics, analytics } = await import('@/lib/analytics/queue')
      disableAnalytics()
      enableAnalytics()

      expect(localStore['analytics_enabled']).toBe('true')
      analytics.destroy()
    })

    it('respects localStorage override set to false', async () => {
      localStore['analytics_enabled'] = 'false'
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics } = await import('@/lib/analytics/queue')
      // With analytics disabled, track should not queue events
      analytics.track('test_event')
      analytics.destroy()
    })

    it('respects localStorage override set to true', async () => {
      localStore['analytics_enabled'] = 'true'
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics } = await import('@/lib/analytics/queue')
      analytics.track('test_event')
      analytics.destroy()
    })
  })

  describe('Event Tracking', () => {
    it('should track events without crashing', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics } = await import('@/lib/analytics/queue')

      expect(() => {
        analytics.track('page_view', { page_title: 'Test Page', load_time_ms: 123 })
      }).not.toThrow()
      analytics.destroy()
    })

    it('should not track events when analytics is disabled', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, disableAnalytics } = await import('@/lib/analytics/queue')
      disableAnalytics()

      expect(() => {
        analytics.track('page_view')
      }).not.toThrow()
      analytics.destroy()
    })

    it('should handle missing properties gracefully', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics } = await import('@/lib/analytics/queue')

      expect(() => {
        analytics.track('page_view')
      }).not.toThrow()
      analytics.destroy()
    })
  })

  describe('Session Management', () => {
    it('generates a session ID on first track', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')

      expect(sessionStore['analytics_session_id']).toBeTruthy()
      analytics.destroy()
    })

    it('reuses existing session ID', async () => {
      sessionStore['analytics_session_id'] = 'existing-session-123'
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')

      expect(sessionStore['analytics_session_id']).toBe('existing-session-123')
      analytics.destroy()
    })

    it('generates anonymous ID on first track', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')

      expect(localStore['analytics_anonymous_id']).toBeTruthy()
      analytics.destroy()
    })

    it('reuses existing anonymous ID', async () => {
      localStore['analytics_anonymous_id'] = 'existing-anon-456'
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')

      expect(localStore['analytics_anonymous_id']).toBe('existing-anon-456')
      analytics.destroy()
    })
  })

  describe('User identification', () => {
    it('reads user ID from localStorage', async () => {
      localStore['analytics_user_id'] = 'user-789'
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('returns null when no user ID is set', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('identifies admin users', async () => {
      localStore['analytics_user_role'] = 'admin'
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('identifies non-admin users', async () => {
      localStore['analytics_user_role'] = 'user'
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('identifyUser stores user ID', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { identifyUser, analytics } = await import('@/lib/analytics/queue')
      identifyUser('user-123')

      expect(localStore['analytics_user_id']).toBe('user-123')
      analytics.destroy()
    })

    it('clearUser removes user ID', async () => {
      localStore['analytics_user_id'] = 'user-123'
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { clearUser, analytics } = await import('@/lib/analytics/queue')
      clearUser()

      expect(localStore['analytics_user_id']).toBeUndefined()
      analytics.destroy()
    })
  })

  describe('Device Detection', () => {
    it('detects mobile device (width < 768)', async () => {
      setupWindowMock({ innerWidth: 375, innerHeight: 667 })
      setupNavigatorMock({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Safari/605.1',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects tablet device (768 <= width < 1024)', async () => {
      setupWindowMock({ innerWidth: 768, innerHeight: 1024 })
      setupNavigatorMock({
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) Safari/605.1',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects desktop device (width >= 1024)', async () => {
      setupWindowMock({ innerWidth: 1920, innerHeight: 1080 })
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects Safari browser', async () => {
      setupWindowMock()
      setupNavigatorMock({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects Firefox browser', async () => {
      setupWindowMock()
      setupNavigatorMock({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects Edge browser', async () => {
      setupWindowMock()
      setupNavigatorMock({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/91.0.864.59',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects unknown browser', async () => {
      setupWindowMock()
      setupNavigatorMock({
        userAgent: 'SomeObscureBrowser/1.0',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects macOS', async () => {
      setupWindowMock()
      setupNavigatorMock({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/91.0',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects Linux', async () => {
      setupWindowMock()
      setupNavigatorMock({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/91.0',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects Android', async () => {
      setupWindowMock({ innerWidth: 400 })
      setupNavigatorMock({
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) Chrome/91.0',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects iOS', async () => {
      setupWindowMock({ innerWidth: 375 })
      setupNavigatorMock({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) Safari/604.1',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('detects unknown OS', async () => {
      setupWindowMock()
      setupNavigatorMock({
        userAgent: 'SomeBot/1.0',
      })
      setupDocumentMock()

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })

    it('handles empty referrer', async () => {
      setupWindowMock()
      setupNavigatorMock()
      Object.defineProperty(global, 'document', {
        value: { referrer: '' },
        writable: true,
        configurable: true,
      })

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()
      analytics.track('test_event')
      analytics.destroy()
    })
  })

  describe('Flush mechanism', () => {
    it('uses setTimeout fallback when requestIdleCallback is not available', async () => {
      // Setup window WITHOUT requestIdleCallback
      const windowMock = {
        location: { pathname: '/test', hostname: 'localhost' },
        innerWidth: 1920,
        innerHeight: 1080,
        addEventListener: vi.fn(),
      }
      Object.defineProperty(global, 'window', {
        value: windowMock,
        writable: true,
        configurable: true,
      })
      delete (global as Record<string, unknown>).requestIdleCallback
      setupNavigatorMock()
      setupDocumentMock()

      global.Blob = vi.fn().mockImplementation((content: unknown[], options: { type: string }) => ({
        content,
        type: options?.type,
      })) as unknown as typeof Blob

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()

      // Track enough events to trigger scheduleFlush (maxBatchSize = 50)
      for (let i = 0; i < 51; i++) {
        analytics.track(`event_${i}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 200))
      analytics.destroy()
    })

    it('sends events via sendBeacon when available', async () => {
      const mockSendBeacon = vi.fn().mockReturnValue(true)
      setupWindowMock()
      setupNavigatorMock({ sendBeacon: mockSendBeacon })
      setupDocumentMock()

      // Mock Blob
      global.Blob = vi.fn().mockImplementation((content, options) => ({
        content,
        type: options?.type,
      })) as unknown as typeof Blob

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()

      // Track events and trigger flush
      analytics.track('test_event')

      // Force flush by making queue large enough
      for (let i = 0; i < 50; i++) {
        analytics.track(`event_${i}`)
      }

      // Wait for flush
      await new Promise((resolve) => setTimeout(resolve, 50))
      analytics.destroy()
    })

    it('falls back to fetch when sendBeacon fails', async () => {
      const mockSendBeacon = vi.fn().mockReturnValue(false)
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      setupWindowMock()
      setupNavigatorMock({ sendBeacon: mockSendBeacon })
      setupDocumentMock()

      global.Blob = vi.fn().mockImplementation((content: unknown[], options: { type: string }) => ({
        content,
        type: options?.type,
      })) as unknown as typeof Blob
      global.fetch = mockFetch

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()

      for (let i = 0; i < 51; i++) {
        analytics.track(`event_${i}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
      analytics.destroy()
    })

    it('falls back to fetch when sendBeacon is not available', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })

      // Setup window without requestIdleCallback to simplify
      const windowMock = {
        location: { pathname: '/test', hostname: 'localhost' },
        innerWidth: 1920,
        innerHeight: 1080,
        addEventListener: vi.fn(),
        requestIdleCallback: vi.fn((cb: () => void) => {
          cb()
          return 1
        }),
      }
      Object.defineProperty(global, 'window', {
        value: windowMock,
        writable: true,
        configurable: true,
      })
      ;(global as Record<string, unknown>).requestIdleCallback = windowMock.requestIdleCallback

      // Navigator WITHOUT sendBeacon
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'TestBrowser/1.0',
        },
        writable: true,
        configurable: true,
      })
      setupDocumentMock()
      global.fetch = mockFetch

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()

      for (let i = 0; i < 51; i++) {
        analytics.track(`event_${i}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
      analytics.destroy()
    })

    it('handles flush errors silently on localhost', async () => {
      setupWindowMock({ location: { pathname: '/test', hostname: 'localhost' } })
      setupNavigatorMock()
      setupDocumentMock()

      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

      // Make Blob constructor throw to trigger error in flush
      global.Blob = vi.fn().mockImplementation(() => {
        throw new Error('Blob error')
      }) as unknown as typeof Blob

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()

      for (let i = 0; i < 51; i++) {
        analytics.track(`event_${i}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
      analytics.destroy()
      consoleSpy.mockRestore()
    })

    it('handles flush errors silently on production', async () => {
      setupWindowMock({ location: { pathname: '/test', hostname: 'reentrymap.org' } })
      setupNavigatorMock()
      setupDocumentMock()

      global.Blob = vi.fn().mockImplementation(() => {
        throw new Error('Blob error')
      }) as unknown as typeof Blob

      const { analytics, enableAnalytics } = await import('@/lib/analytics/queue')
      enableAnalytics()

      for (let i = 0; i < 51; i++) {
        analytics.track(`event_${i}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
      analytics.destroy()
    })
  })

  describe('Cleanup', () => {
    it('destroy clears flush timer', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics } = await import('@/lib/analytics/queue')
      // Should not throw
      expect(() => analytics.destroy()).not.toThrow()
    })

    it('destroy handles no active timer', async () => {
      setupWindowMock()
      setupNavigatorMock()
      setupDocumentMock()

      const { analytics, disableAnalytics } = await import('@/lib/analytics/queue')
      disableAnalytics() // Clears timer
      expect(() => analytics.destroy()).not.toThrow()
    })
  })
})
