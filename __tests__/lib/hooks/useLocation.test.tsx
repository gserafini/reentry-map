import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLocation, getLocationErrorMessage } from '@/lib/hooks/useLocation'

describe('useLocation', () => {
  let mockGeolocation: {
    getCurrentPosition: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Mock geolocation API
    mockGeolocation = {
      getCurrentPosition: vi.fn(),
    }

    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    })

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    }
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    })

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('initializes with null coordinates and no error', () => {
    const { result } = renderHook(() => useLocation())

    expect(result.current.coordinates).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.isSupported).toBe(true)
  })

  it('detects geolocation support', () => {
    const { result } = renderHook(() => useLocation())

    expect(result.current.isSupported).toBe(true)
  })

  it('handles unsupported geolocation', () => {
    // Remove geolocation from navigator
    // @ts-expect-error - Deleting for test purposes
    delete global.navigator.geolocation

    const { result } = renderHook(() => useLocation())

    expect(result.current.isSupported).toBe(false)

    // Try to request location
    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.error).toBe('not-supported')
  })

  it('requests location successfully', async () => {
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 37.8044,
        longitude: -122.2712,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }

    mockGeolocation.getCurrentPosition.mockImplementation((successCallback) => {
      successCallback(mockPosition)
    })

    const { result } = renderHook(() => useLocation())

    act(() => {
      result.current.requestLocation()
    })

    await waitFor(() => {
      expect(result.current.coordinates).toEqual({
        latitude: 37.8044,
        longitude: -122.2712,
      })
      expect(result.current.displayName).toBe('Current Location')
      expect(result.current.source).toBe('geolocation')
      expect(result.current.error).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  it('sets loading state while requesting location', () => {
    mockGeolocation.getCurrentPosition.mockImplementation(() => {
      // Don't call success or error callbacks immediately
    })

    const { result } = renderHook(() => useLocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.loading).toBe(true)
  })

  it('handles permission denied error', async () => {
    const mockError: GeolocationPositionError = {
      code: 1,
      message: 'User denied geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    }

    mockGeolocation.getCurrentPosition.mockImplementation((_, errorCallback) => {
      errorCallback(mockError)
    })

    const { result } = renderHook(() => useLocation())

    act(() => {
      result.current.requestLocation()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('permission-denied')
      expect(result.current.loading).toBe(false)
      expect(result.current.coordinates).toBeNull()
    })
  })

  it('handles position unavailable error', async () => {
    const mockError: GeolocationPositionError = {
      code: 2,
      message: 'Position unavailable',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    }

    mockGeolocation.getCurrentPosition.mockImplementation((_, errorCallback) => {
      errorCallback(mockError)
    })

    const { result } = renderHook(() => useLocation())

    act(() => {
      result.current.requestLocation()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('position-unavailable')
    })
  })

  it('handles timeout error', async () => {
    const mockError: GeolocationPositionError = {
      code: 3,
      message: 'Timeout',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    }

    mockGeolocation.getCurrentPosition.mockImplementation((_, errorCallback) => {
      errorCallback(mockError)
    })

    const { result } = renderHook(() => useLocation())

    act(() => {
      result.current.requestLocation()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('timeout')
    })
  })

  it('sets manual location', () => {
    const { result } = renderHook(() => useLocation())

    act(() => {
      result.current.setManualLocation({ latitude: 37.8044, longitude: -122.2712 }, 'Oakland, CA')
    })

    expect(result.current.coordinates).toEqual({
      latitude: 37.8044,
      longitude: -122.2712,
    })
    expect(result.current.displayName).toBe('Oakland, CA')
    expect(result.current.source).toBe('manual')
    expect(result.current.error).toBeNull()
  })

  it('clears location', () => {
    const { result } = renderHook(() => useLocation())

    // Set manual location first
    act(() => {
      result.current.setManualLocation({ latitude: 37.8044, longitude: -122.2712 }, 'Oakland, CA')
    })

    expect(result.current.coordinates).not.toBeNull()

    // Clear location
    act(() => {
      result.current.clearLocation()
    })

    expect(result.current.coordinates).toBeNull()
    expect(result.current.displayName).toBeNull()
    expect(result.current.source).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.lastUpdated).toBeNull()
    expect(localStorage.removeItem).toHaveBeenCalledWith('userLocation')
  })

  it('saves location to localStorage cache', async () => {
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 37.8044,
        longitude: -122.2712,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }

    mockGeolocation.getCurrentPosition.mockImplementation((successCallback) => {
      successCallback(mockPosition)
    })

    const { result } = renderHook(() => useLocation())

    act(() => {
      result.current.requestLocation()
    })

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'userLocation',
        expect.stringContaining('"latitude":37.8044')
      )
    })
  })

  it('loads cached location on mount', () => {
    const cachedLocation = {
      coordinates: { latitude: 37.8044, longitude: -122.2712 },
      timestamp: Date.now(),
      displayName: 'Oakland, CA',
      source: 'manual',
    }

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(cachedLocation))

    const { result } = renderHook(() => useLocation())

    expect(result.current.coordinates).toEqual({
      latitude: 37.8044,
      longitude: -122.2712,
    })
    expect(result.current.displayName).toBe('Oakland, CA')
    expect(result.current.source).toBe('manual')
  })

  it('ignores expired cache', () => {
    const expiredLocation = {
      coordinates: { latitude: 37.8044, longitude: -122.2712 },
      timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago (definitely expired)
      displayName: 'Oakland, CA',
      source: 'manual',
    }

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(expiredLocation))

    const { result } = renderHook(() => useLocation())

    expect(result.current.coordinates).toBeNull()
    expect(localStorage.removeItem).toHaveBeenCalledWith('userLocation')
  })

  it('auto-requests location when autoRequest is true', async () => {
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 37.8044,
        longitude: -122.2712,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }

    mockGeolocation.getCurrentPosition.mockImplementation((successCallback) => {
      successCallback(mockPosition)
    })

    renderHook(() => useLocation(true))

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
    })
  })

  it('does not auto-request when autoRequest is false', () => {
    renderHook(() => useLocation(false))

    expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled()
  })
})

describe('getLocationErrorMessage', () => {
  it('returns correct message for permission-denied', () => {
    const message = getLocationErrorMessage('permission-denied')
    expect(message).toContain('denied')
    expect(message).toContain('permissions')
  })

  it('returns correct message for position-unavailable', () => {
    const message = getLocationErrorMessage('position-unavailable')
    expect(message).toContain('unavailable')
  })

  it('returns correct message for timeout', () => {
    const message = getLocationErrorMessage('timeout')
    expect(message).toContain('timed out')
  })

  it('returns correct message for not-supported', () => {
    const message = getLocationErrorMessage('not-supported')
    expect(message).toContain('not supported')
  })

  it('returns correct message for unknown error', () => {
    const message = getLocationErrorMessage('unknown')
    expect(message).toContain('unknown')
  })
})
