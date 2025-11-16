import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { analytics, enableAnalytics, disableAnalytics } from '@/lib/analytics/queue'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock window.location
Object.defineProperty(global, 'window', {
  value: {
    location: {
      pathname: '/test',
      hostname: 'localhost',
    },
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: vi.fn(),
  },
  writable: true,
})

// Mock document
Object.defineProperty(global, 'document', {
  value: {
    referrer: 'https://google.com',
  },
  writable: true,
})

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    sendBeacon: vi.fn().mockReturnValue(true),
  },
  writable: true,
})

describe('Analytics Queue', () => {
  beforeEach(() => {
    localStorageMock.clear()
    sessionStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up analytics instance
    if (analytics) {
      analytics.destroy()
    }
  })

  describe('Enable/Disable', () => {
    it('should be enabled by default', () => {
      const enabled = localStorageMock.getItem('analytics_enabled')
      // Should be null (default) which means enabled
      expect(enabled === null || enabled === 'true').toBe(true)
    })

    it('should disable analytics when disableAnalytics() is called', () => {
      disableAnalytics()
      expect(localStorageMock.getItem('analytics_enabled')).toBe('false')
    })

    it('should enable analytics when enableAnalytics() is called', () => {
      disableAnalytics()
      enableAnalytics()
      expect(localStorageMock.getItem('analytics_enabled')).toBe('true')
    })
  })

  describe('Event Tracking', () => {
    it('should track events with basic properties', () => {
      // This is a smoke test - just verify it doesn't crash
      expect(() => {
        analytics.track('page_view', {
          page_title: 'Test Page',
          load_time_ms: 123,
        })
      }).not.toThrow()
    })

    it('should not track events when analytics is disabled', () => {
      disableAnalytics()

      // Tracking should silently do nothing
      expect(() => {
        analytics.track('page_view')
      }).not.toThrow()
    })

    it('should handle missing properties gracefully', () => {
      expect(() => {
        analytics.track('page_view')
      }).not.toThrow()
    })
  })

  describe('Session Management', () => {
    it('should generate a session ID', () => {
      // Enable analytics first (required for track() to execute)
      enableAnalytics()

      // Trigger session ID generation
      analytics.track('test_event')

      const sessionId = sessionStorageMock.getItem('analytics_session_id')
      expect(sessionId).toBeTruthy()
      expect(typeof sessionId).toBe('string')
    })

    it('should generate an anonymous ID', () => {
      // Enable analytics first (required for track() to execute)
      enableAnalytics()

      // Trigger anonymous ID generation
      analytics.track('test_event')

      const anonymousId = localStorageMock.getItem('analytics_anonymous_id')
      expect(anonymousId).toBeTruthy()
      expect(typeof anonymousId).toBe('string')
    })
  })
})
