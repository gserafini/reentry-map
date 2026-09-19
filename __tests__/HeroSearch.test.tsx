import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  resetRouterMocks,
  setMockSearchParams,
  setMockPathname,
  getMockRouter,
} from '@/__tests__/test-utils'
import { HeroSearch } from '@/components/search/HeroSearch'
vi.mock('@/components/search/LocationInput', () => ({
  LocationInput: () => <input aria-label="Location search" />,
}))
vi.mock('@/lib/context/LocationContext', () => ({
  useUserLocation: () => ({
    coordinates: { latitude: 33.58, longitude: -101.85 },
    displayName: 'Lubbock, TX',
  }),
}))

describe('HeroSearch', () => {
  beforeEach(resetRouterMocks)
  it('provides a labeled need input and named submit action', () => {
    render(<HeroSearch />)
    expect(screen.getByRole('textbox', { name: 'What do you need?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find help' })).toBeInTheDocument()
  })
  it('keeps an explicit map area when changing the need', () => {
    setMockSearchParams({
      locationName: 'Map view',
      north: '33',
      south: '32',
      east: '-96',
      west: '-97',
    })
    render(<HeroSearch initialValue="jobs" />)
    fireEvent.submit(screen.getByRole('textbox', { name: 'What do you need?' }).closest('form')!)
    const url = getMockRouter().push.mock.calls[0][0]
    expect(url).toContain('north=33')
    expect(url).toContain('south=32')
    expect(url).toContain('east=-96')
    expect(url).toContain('west=-97')
    expect(url).not.toContain('lat=')
    expect(url).not.toContain('Lubbock')
  })
  it('preserves state and tag filters when changing the need', () => {
    setMockSearchParams({ state: 'TX', tags: 'veterans' })
    render(<HeroSearch initialValue="jobs" />)
    fireEvent.submit(screen.getByRole('textbox', { name: 'What do you need?' }).closest('form')!)
    const url = getMockRouter().push.mock.calls[0][0]
    expect(url).toContain('state=TX')
    expect(url).toContain('tags=veterans')
    expect(url).not.toContain('lat=')
    expect(url).not.toContain('Lubbock')
  })
  it('preserves selected category filters when editing the need', () => {
    setMockSearchParams({ categories: 'employment', state: 'TX' })
    render(<HeroSearch initialValue="training" />)
    fireEvent.submit(screen.getByRole('textbox', { name: 'What do you need?' }).closest('form')!)
    expect(getMockRouter().push.mock.calls[0][0]).toContain('categories=employment')
  })
  it('preserves the route category ahead of a conflicting query filter', () => {
    setMockPathname('/tx/dallas/category/housing')
    setMockSearchParams({ categories: 'employment' })
    render(<HeroSearch initialValue="transitional" />)
    fireEvent.submit(screen.getByRole('textbox', { name: 'What do you need?' }).closest('form')!)
    expect(getMockRouter().push.mock.calls[0][0]).toContain('categories=housing')
    expect(getMockRouter().push.mock.calls[0][0]).not.toContain('employment')
  })
  it('keeps nationwide scope when changing a need on the results page', () => {
    setMockPathname('/resources')
    render(<HeroSearch initialValue="food" />)
    fireEvent.submit(screen.getByRole('textbox', { name: 'What do you need?' }).closest('form')!)
    expect(getMockRouter().push).toHaveBeenCalledWith('/search?search=food')
  })
  it('keeps the explicit location ahead of cached location', () => {
    setMockSearchParams({ locationName: 'Dallas, TX', lat: '32.77', lng: '-96.79', distance: '25' })
    render(<HeroSearch initialValue="housing" />)
    fireEvent.submit(screen.getByRole('textbox', { name: 'What do you need?' }).closest('form')!)
    expect(getMockRouter().push).toHaveBeenCalledWith(
      '/search?search=housing&locationName=Dallas%2C+TX&lat=32.77&lng=-96.79&distance=25'
    )
  })
})
