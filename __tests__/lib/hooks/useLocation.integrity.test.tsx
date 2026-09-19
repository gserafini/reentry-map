import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocation } from '@/lib/hooks/useLocation'
const valid = { latitude: 32.77, longitude: -96.79, city: 'Dallas', region: 'Texas' }
describe('location integrity', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => valid }))
    )
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  it('reads the actual flat GeoIP API response and caches only valid location data', async () => {
    const { result } = renderHook(() => useLocation())
    await waitFor(() => expect(result.current.source).toBe('geoip'))
    expect(result.current.coordinates).toEqual({ latitude: 32.77, longitude: -96.79 })
    expect(result.current.displayName).toBe('Dallas, Texas')
    expect(JSON.parse(localStorage.getItem('userLocation')!)).toMatchObject({
      source: 'geoip',
      displayName: 'Dallas, Texas',
    })
  })
  it.each([
    {},
    { city: 'Dallas' },
    { ...valid, latitude: 200 },
    { ...valid, longitude: Infinity },
    { ...valid, latitude: '32.77' },
    { latitude: 32.77, longitude: -96.79, city: ' ', region: '' },
    { ...valid, isDefaultLocation: true },
    { ...valid, error: 'fallback' },
  ])(
    'does not fabricate a visitor location from invalid or fallback payload %j',
    async (payload) => {
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => payload } as Response)
      const { result } = renderHook(() => useLocation())
      await act(async () => {
        await Promise.resolve()
      })
      expect(result.current.coordinates).toBeNull()
      expect(result.current.displayName).toBeNull()
      expect(localStorage.getItem('userLocation')).toBeNull()
    }
  )
  it('ignores malformed cached manual coordinates and labels', async () => {
    localStorage.setItem(
      'userLocation',
      JSON.stringify({
        coordinates: {},
        displayName: 'undefined, undefined',
        source: 'manual',
        timestamp: Date.now(),
      })
    )
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ isDefaultLocation: true }),
    } as Response)
    const { result } = renderHook(() => useLocation())
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.coordinates).toBeNull()
    expect(result.current.displayName).toBeNull()
    expect(localStorage.getItem('userLocation')).toBeNull()
  })
  it('does not request GeoIP when a valid cache was restored', () => {
    localStorage.setItem(
      'userLocation',
      JSON.stringify({
        coordinates: { latitude: 32.77, longitude: -96.79 },
        displayName: 'Dallas, TX',
        source: 'manual',
        timestamp: Date.now(),
      })
    )
    const { result } = renderHook(() => useLocation())
    expect(result.current.displayName).toBe('Dallas, TX')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('ignores late GeoIP after a manual choice', async () => {
    let finish!: (response: Response) => void
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    const { result } = renderHook(() => useLocation())
    act(() =>
      result.current.setManualLocation({ latitude: 21.3, longitude: -157.8 }, 'Honolulu, HI')
    )
    await act(async () =>
      finish({ ok: true, json: async () => ({ location: valid, ...valid }) } as Response)
    )
    expect(result.current.displayName).toBe('Honolulu, HI')
    expect(result.current.source).toBe('manual')
  })
  it('clearing invalidates pending GeoIP and does not immediately start another fetch', async () => {
    let finish!: (response: Response) => void
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    const { result } = renderHook(() => useLocation())
    act(() => result.current.clearLocation())
    await act(async () =>
      finish({ ok: true, json: async () => ({ location: valid, ...valid }) } as Response)
    )
    expect(result.current.coordinates).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('manual selection and clearing work when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useLocation())
    act(() => result.current.setManualLocation({ latitude: 32.77, longitude: -96.79 }, 'Dallas'))
    expect(result.current.displayName).toBe('Dallas')
    expect(() => act(() => result.current.clearLocation())).not.toThrow()
    expect(result.current.coordinates).toBeNull()
  })
  it.each(['manual', 'geoip'])('does not refresh GPS for a %s location', (source) => {
    vi.useFakeTimers()
    localStorage.setItem(
      'userLocation',
      JSON.stringify({
        coordinates: { latitude: 32.77, longitude: -96.79 },
        displayName: 'Dallas, TX',
        source,
        timestamp: Date.now(),
      })
    )
    renderHook(() => useLocation())
    act(() => vi.advanceTimersByTime(120001))
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })
  it('ignores a late GPS answer after a newer manual choice', () => {
    const { result } = renderHook(() => useLocation())
    act(() => result.current.requestLocation())
    const success = vi.mocked(navigator.geolocation.getCurrentPosition).mock.calls[0][0]
    act(() =>
      result.current.setManualLocation({ latitude: 21.3, longitude: -157.8 }, 'Honolulu, HI')
    )
    act(() => success({ coords: { latitude: 32.77, longitude: -96.79 } } as GeolocationPosition))
    expect(result.current.displayName).toBe('Honolulu, HI')
  })
  it('refreshes GPS only while the visitor still uses GPS', () => {
    vi.useFakeTimers()
    localStorage.setItem(
      'userLocation',
      JSON.stringify({
        coordinates: { latitude: 32.77, longitude: -96.79 },
        displayName: 'Current Location',
        source: 'geolocation',
        timestamp: Date.now(),
      })
    )
    const { result } = renderHook(() => useLocation())
    act(() => vi.advanceTimersByTime(120001))
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)
    const success = vi.mocked(navigator.geolocation.getCurrentPosition).mock.calls[0][0]
    act(() =>
      result.current.setManualLocation({ latitude: 21.3, longitude: -157.8 }, 'Honolulu, HI')
    )
    act(() => success({ coords: { latitude: 32.77, longitude: -96.79 } } as GeolocationPosition))
    act(() => vi.advanceTimersByTime(120001))
    expect(result.current.displayName).toBe('Honolulu, HI')
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)
  })
  it('rejects invalid manual coordinates and empty labels', () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    const { result } = renderHook(() => useLocation())
    act(() => result.current.setManualLocation({ latitude: NaN, longitude: 10 }, 'Dallas'))
    expect(result.current.coordinates).toBeNull()
    act(() => result.current.setManualLocation({ latitude: 32.77, longitude: -96.79 }, ' '))
    expect(result.current.coordinates).toBeNull()
  })
})
