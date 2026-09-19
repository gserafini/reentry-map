import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  render,
  resetRouterMocks,
  setMockPathname,
  setMockSearchParams,
  getMockRouter,
} from '@/__tests__/test-utils'
import { LocationInput } from '@/components/search/LocationInput'
const mocks = vi.hoisted(() => ({
  placeLatitude: 32.77,
  context: {
    displayName: 'Lubbock, TX',
    coordinates: { latitude: 33.58, longitude: -101.85 },
    source: 'manual',
    error: null as string | null,
    loading: false,
    setManualLocation: vi.fn(),
    requestLocation: vi.fn(),
  },
  geocode: vi.fn(async () => ({ results: [] })),
}))
vi.mock('@/lib/context/LocationContext', () => ({ useUserLocation: () => mocks.context }))
vi.mock('@/lib/google-maps', () => ({
  initializeGoogleMaps: async () => ({
    places: {
      AutocompleteService: class {
        async getPlacePredictions() {
          return {
            predictions: [
              {
                place_id: 'dallas',
                description: 'Dallas, TX',
                structured_formatting: { main_text: 'Dallas', secondary_text: 'TX' },
              },
            ],
          }
        }
      },
      Place: class {
        location = { lat: () => mocks.placeLatitude, lng: () => -96.79 }
        async fetchFields() {}
      },
    },
    geocoding: {
      Geocoder: class {
        geocode = mocks.geocode
      },
    },
  }),
}))
describe('visible search location scope', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => {
    resetRouterMocks()
    setMockPathname('/resources')
    mocks.placeLatitude = 32.77
    mocks.context.source = 'manual'
    mocks.context.error = null
    vi.clearAllMocks()
  })
  it('leaves nationwide Where blank despite a cached device location', async () => {
    render(<LocationInput />)
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue(''))
  })
  it('shows explicit state query scope ahead of cached location', async () => {
    setMockSearchParams({ state: 'TX' })
    render(<LocationInput />)
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('TX'))
  })
  it('allows cached location as a starting choice on the homepage', async () => {
    setMockPathname('/')
    render(<LocationInput />)
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Lubbock, TX'))
  })
  it('does not reverse-geocode cached GPS and change an existing results scope', async () => {
    mocks.context.source = 'geolocation'
    setMockSearchParams({ state: 'CA' })
    render(<LocationInput />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(mocks.geocode).not.toHaveBeenCalled()
    expect(getMockRouter().push).not.toHaveBeenCalled()
  })
  it('still selects a location when optional browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    render(<LocationInput />)
    await act(async () => {
      await Promise.resolve()
    })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Dallas' } })
    const option = await screen.findByRole('option', { name: 'Dallas TX' })
    fireEvent.click(option)
    await waitFor(() =>
      expect(getMockRouter().push).toHaveBeenCalledWith(
        expect.stringContaining('locationName=Dallas%2C+TX'),
        { scroll: false }
      )
    )
  })
  it('keeps a successful GPS location usable when its city name is unavailable', async () => {
    const onValidityChange = vi.fn()
    const { rerender } = render(<LocationInput onValidityChange={onValidityChange} />)
    await act(async () => {
      await Promise.resolve()
    })
    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'Current Location' }))
    mocks.context.source = 'geolocation'
    rerender(<LocationInput onValidityChange={onValidityChange} />)
    await waitFor(() =>
      expect(getMockRouter().push).toHaveBeenCalledWith(expect.stringContaining('lat=33.58'), {
        scroll: false,
      })
    )
    expect(onValidityChange).toHaveBeenLastCalledWith(true)
  })
  it('does not navigate with invalid coordinates returned by a place lookup', async () => {
    mocks.placeLatitude = 200
    render(<LocationInput />)
    await act(async () => {
      await Promise.resolve()
    })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Dallas' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Dallas TX' }))
    expect(
      await screen.findByText('Location unavailable. Choose another suggestion.')
    ).toBeInTheDocument()
    expect(getMockRouter().push).not.toHaveBeenCalled()
    expect(mocks.context.setManualLocation).not.toHaveBeenCalled()
  })
  it('offers manual location after a denied GPS request', async () => {
    const onValidityChange = vi.fn()
    const { rerender } = render(<LocationInput onValidityChange={onValidityChange} />)
    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'Current Location' }))
    mocks.context.error = 'permission-denied'
    rerender(<LocationInput onValidityChange={onValidityChange} />)
    expect(
      await screen.findByText('Location unavailable. Enter a city, state, or ZIP.')
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(onValidityChange).toHaveBeenLastCalledWith(true)
  })
})
