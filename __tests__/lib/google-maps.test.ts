import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Save original env
const originalEnv = { ...process.env }

// We need to reset module state between tests since google-maps.ts uses module-level singletons
describe('google-maps', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // Reset the environment
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('initializeGoogleMaps', () => {
    it('throws when API key is not configured', async () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

      const { initializeGoogleMaps } = await import('@/lib/google-maps')

      await expect(initializeGoogleMaps()).rejects.toThrow(
        'Google Maps API key not configured in environment variables'
      )
    })

    it('throws descriptive error message for missing key', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = ''

      const { initializeGoogleMaps } = await import('@/lib/google-maps')

      await expect(initializeGoogleMaps()).rejects.toThrow('Google Maps API key not configured')
    })

    it('loads script with correct API key in URL', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'test-api-key-123'

      // Mock document methods
      const mockAppendChild = vi.fn()
      const mockQuerySelector = vi.fn().mockReturnValue(null)
      const mockCreateElement = vi.fn().mockReturnValue({
        set src(val: string) {
          // Verify the script URL contains the API key
          expect(val).toContain('test-api-key-123')
          expect(val).toContain('maps.googleapis.com')
          expect(val).toContain('libraries=places,geocoding,marker')
        },
        get src() {
          return ''
        },
        async: false,
        defer: false,
        onload: null as (() => void) | null,
        onerror: null as ((e: unknown) => void) | null,
      })

      // Set up DOM mocks
      Object.defineProperty(global, 'document', {
        value: {
          querySelector: mockQuerySelector,
          createElement: mockCreateElement,
          head: { appendChild: mockAppendChild },
        },
        writable: true,
        configurable: true,
      })

      const { initializeGoogleMaps } = await import('@/lib/google-maps')

      // Start initialization but don't await (it will hang waiting for script load)
      const promise = initializeGoogleMaps()

      // Verify script element was created
      expect(mockCreateElement).toHaveBeenCalledWith('script')

      // Clean up - reject the promise to avoid hanging
      promise.catch(() => {}) // Suppress unhandled rejection
    })

    it('reuses existing script element if already in DOM', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'test-key'

      const mockCreateElement = vi.fn()
      // querySelector returns an existing script element
      const mockQuerySelector = vi.fn().mockReturnValue({ src: 'maps.googleapis.com' })

      Object.defineProperty(global, 'document', {
        value: {
          querySelector: mockQuerySelector,
          createElement: mockCreateElement,
          head: { appendChild: vi.fn() },
        },
        writable: true,
        configurable: true,
      })

      // Mock google.maps with importLibrary
      const mockImportLibrary = vi
        .fn()
        .mockResolvedValueOnce({ PlacesService: {} })
        .mockResolvedValueOnce({ Geocoder: {} })
        .mockResolvedValueOnce({ Map: {} })
        .mockResolvedValueOnce({ AdvancedMarkerElement: {} })

      Object.defineProperty(global, 'window', {
        value: {
          ...global.window,
          google: { maps: { importLibrary: mockImportLibrary } },
        },
        writable: true,
        configurable: true,
      })

      Object.defineProperty(global, 'google', {
        value: { maps: { importLibrary: mockImportLibrary } },
        writable: true,
        configurable: true,
      })

      const { initializeGoogleMaps } = await import('@/lib/google-maps')
      const result = await initializeGoogleMaps()

      // Should NOT create a new script
      expect(mockCreateElement).not.toHaveBeenCalled()
      expect(mockImportLibrary).toHaveBeenCalledTimes(4)
      expect(result.places).toBeDefined()
      expect(result.maps).toBeDefined()
    })

    it('returns cached libraries on subsequent calls', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'test-key'

      const mockImportLibrary = vi
        .fn()
        .mockResolvedValueOnce({ PlacesService: {} })
        .mockResolvedValueOnce({ Geocoder: {} })
        .mockResolvedValueOnce({ Map: {} })
        .mockResolvedValueOnce({ AdvancedMarkerElement: {} })

      Object.defineProperty(global, 'document', {
        value: {
          querySelector: vi.fn().mockReturnValue({ src: 'maps.googleapis.com' }),
          createElement: vi.fn(),
          head: { appendChild: vi.fn() },
        },
        writable: true,
        configurable: true,
      })

      Object.defineProperty(global, 'window', {
        value: {
          ...global.window,
          google: { maps: { importLibrary: mockImportLibrary } },
        },
        writable: true,
        configurable: true,
      })

      Object.defineProperty(global, 'google', {
        value: { maps: { importLibrary: mockImportLibrary } },
        writable: true,
        configurable: true,
      })

      const { initializeGoogleMaps } = await import('@/lib/google-maps')

      const result1 = await initializeGoogleMaps()
      expect(mockImportLibrary).toHaveBeenCalledTimes(4)

      // Second call should return cached - no additional imports
      const result2 = await initializeGoogleMaps()
      expect(mockImportLibrary).toHaveBeenCalledTimes(4) // Still 4
      expect(result2.places).toBe(result1.places)
    })

    it('handles script load error', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'test-key'

      type ScriptEl = {
        onerror: ((e: unknown) => void) | null
        onload: (() => void) | null
        src: string
        async: boolean
        defer: boolean
      }
      let scriptElement: ScriptEl | null = null

      Object.defineProperty(global, 'document', {
        value: {
          querySelector: vi.fn().mockReturnValue(null),
          createElement: () => {
            const el: ScriptEl = {
              src: '',
              async: false,
              defer: false,
              onload: null,
              onerror: null,
            }
            scriptElement = el
            return el
          },
          head: { appendChild: vi.fn() },
        },
        writable: true,
        configurable: true,
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { initializeGoogleMaps } = await import('@/lib/google-maps')

      const promise = initializeGoogleMaps()

      // Trigger the onerror handler
      if (scriptElement && (scriptElement as ScriptEl).onerror) {
        ;(scriptElement as ScriptEl).onerror!(new Error('Load failed'))
      }

      await expect(promise).rejects.toThrow('Failed to load Google Maps script')
      consoleSpy.mockRestore()
    })

    it('handles missing importLibrary after script loads', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'test-key'

      type ScriptEl = {
        onload: (() => void) | null
        onerror: ((e: unknown) => void) | null
        src: string
        async: boolean
        defer: boolean
      }
      let scriptElement: ScriptEl | null = null

      Object.defineProperty(global, 'document', {
        value: {
          querySelector: vi.fn().mockReturnValue(null),
          createElement: () => {
            const el: ScriptEl = {
              src: '',
              async: false,
              defer: false,
              onload: null,
              onerror: null,
            }
            scriptElement = el
            return el
          },
          head: { appendChild: vi.fn() },
        },
        writable: true,
        configurable: true,
      })

      // google.maps exists but without importLibrary
      Object.defineProperty(global, 'window', {
        value: { google: { maps: {} } },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(global, 'google', {
        value: { maps: {} },
        writable: true,
        configurable: true,
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { initializeGoogleMaps } = await import('@/lib/google-maps')

      const promise = initializeGoogleMaps()

      // Trigger script onload
      if (scriptElement && (scriptElement as ScriptEl).onload) {
        ;(scriptElement as ScriptEl).onload!()
      }

      await expect(promise).rejects.toThrow('importLibrary function not available')
      consoleSpy.mockRestore()
    }, 10000) // Increase timeout - retry loop waits up to 5s
  })
})
