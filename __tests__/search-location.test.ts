import { describe, expect, it } from 'vitest'
import { resolveSearchLocation } from '@/lib/utils/search-location'
import { buildResourcesQueryOptions } from '@/app/resources/params'

describe('explicit search location', () => {
  it('uses URL coordinates and names as one scope', () => {
    expect(
      resolveSearchLocation(
        new URLSearchParams('lat=32.7767&lng=-96.797&distance=25&locationName=Dallas%2C+TX')
      )
    ).toMatchObject({
      coordinates: { latitude: 32.7767, longitude: -96.797 },
      radiusMiles: 25,
      label: 'Dallas, TX',
    })
  })
  it('state scope never has a radius or a coordinate origin', () => {
    expect(
      resolveSearchLocation(
        new URLSearchParams('locationName=Texas%2C+USA&lat=31&lng=-99&distance=25')
      )
    ).toMatchObject({
      coordinates: null,
      radiusMiles: undefined,
      state: 'TX',
    })
  })
  it('unscoped and invalid locations do not pretend to use a cached location', () => {
    expect(resolveSearchLocation(new URLSearchParams())).toMatchObject({
      coordinates: null,
      label: 'Nationwide',
    })
    expect(resolveSearchLocation(new URLSearchParams('lat=999&lng=20'))).toMatchObject({
      coordinates: null,
    })
  })
  it('uses the city route as the scope rather than visitor location', () => {
    expect(resolveSearchLocation(new URLSearchParams(), '/tx/dallas')).toMatchObject({
      city: 'Dallas',
      state: 'TX',
      label: 'Dallas, TX',
      coordinates: null,
    })
    expect(buildResourcesQueryOptions({ city: 'Dallas', state: 'TX' })).toMatchObject({
      city: 'Dallas',
      state: 'TX',
    })
  })
  it('validates categories and carries the coverage lookup label through to the query', () => {
    expect(
      buildResourcesQueryOptions({
        categories: 'housing,garbage,housing',
        lat: '32.7',
        lng: '-96.8',
        locationName: 'Dallas, TX',
      })
    ).toMatchObject({
      categories: ['housing'],
      locationName: 'Dallas, TX',
      radius_miles: 25,
      latitude: 32.7,
    })
  })
})
