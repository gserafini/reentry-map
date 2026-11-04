import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, getMockRouter, resetRouterMocks } from '@/__tests__/test-utils'
import { LocationUrlSync } from '@/components/search/LocationUrlSync'
import { useUserLocation } from '@/lib/context/LocationContext'
import type { UseLocationResult } from '@/lib/hooks/useLocation'

vi.mock('@/lib/context/LocationContext', () => ({ useUserLocation: vi.fn() }))

const emptyLocation: UseLocationResult = {
  coordinates: null,
  displayName: null,
  source: null,
  error: null,
  loading: false,
  requestLocation: vi.fn(),
  setManualLocation: vi.fn(),
  clearLocation: vi.fn(),
  isSupported: true,
  lastUpdated: null,
}
const dallas = { latitude: 32.8152, longitude: -96.8703 }

describe('entry-page location URL synchronization', () => {
  beforeEach(() => {
    resetRouterMocks()
    vi.mocked(useUserLocation).mockReturnValue(emptyLocation)
  })

  it('does not replace a category navigation when a passive GeoIP lookup finishes', () => {
    const { rerender } = render(<LocationUrlSync />)
    getMockRouter().push('/resources?categories=employment')

    vi.mocked(useUserLocation).mockReturnValue({
      ...emptyLocation,
      coordinates: dallas,
      displayName: 'Dallas, Texas',
      source: 'geoip',
    })
    rerender(<LocationUrlSync />)

    expect(getMockRouter().replace).not.toHaveBeenCalled()
  })

  it.each(['manual', 'geolocation'] as const)(
    'still synchronizes a visitor-selected %s location after a GeoIP suggestion',
    (source) => {
      vi.mocked(useUserLocation).mockReturnValue({
        ...emptyLocation,
        coordinates: dallas,
        displayName: 'Dallas, Texas',
        source: 'geoip',
      })
      const { rerender } = render(<LocationUrlSync />)
      getMockRouter().replace.mockClear()

      vi.mocked(useUserLocation).mockReturnValue({
        ...emptyLocation,
        coordinates: dallas,
        displayName: 'Dallas, Texas',
        source,
      })
      rerender(<LocationUrlSync />)

      expect(getMockRouter().replace).toHaveBeenCalledOnce()
      const [url] = getMockRouter().replace.mock.calls[0]
      const query = new URL(url, 'https://reentrymap.org').searchParams
      expect(query.get('lat')).toBe('32.8152')
      expect(query.get('locationName')).toBe('Dallas, Texas')
    }
  )
})
