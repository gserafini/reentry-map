import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, resetRouterMocks } from '@/__tests__/test-utils'
import { LocationInput } from '@/components/search/LocationInput'
import { LocationProvider } from '@/lib/context/LocationContext'
vi.mock('@/lib/google-maps', () => ({
  initializeGoogleMaps: async () => ({ places: {}, geocoding: {} }),
}))
describe('homepage shared location loading', () => {
  beforeEach(() => {
    localStorage.clear()
    resetRouterMocks()
  })
  afterEach(() => vi.unstubAllGlobals())
  it('does not turn the actual default GeoIP response into an undefined location or cache', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ country: 'United States', ip: '127.0.0.1', isDefaultLocation: true }),
      }))
    )
    render(
      <LocationProvider>
        <LocationInput />
      </LocationProvider>
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(localStorage.getItem('userLocation')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('has one GeoIP loader and shows a valid flat response consistently', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ latitude: 32.77, longitude: -96.79, city: 'Dallas', region: 'Texas' }),
      }))
    )
    render(
      <LocationProvider>
        <LocationInput />
      </LocationProvider>
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByRole('combobox')).toHaveValue('Dallas, Texas')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem('userLocation')!)).toMatchObject({ source: 'geoip' })
  })
})
