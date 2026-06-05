import { describe, expect, it } from 'vitest'

import { buildResourcesQueryOptions } from '@/app/resources/params'

describe('resources page query options', () => {
  it('uses location params and defaults to distance sorting when coordinates are present', () => {
    const result = buildResourcesQueryOptions({
      search: 'housing',
      categories: 'employment,housing',
      lat: '32.715738',
      lng: '-117.1610838',
      distance: '25',
    })

    expect(result).toMatchObject({
      search: 'housing',
      categories: ['employment', 'housing'],
      latitude: 32.715738,
      longitude: -117.1610838,
      radius_miles: 25,
      sort: { field: 'distance', direction: 'asc' },
      isSearching: true,
      isFiltering: true,
    })
  })

  it('treats a US state location name as a state filter instead of a 25-mile centroid search', () => {
    const result = buildResourcesQueryOptions({
      locationName: 'Washington, USA',
      lat: '47.7510741',
      lng: '-120.7401386',
      distance: '25',
    })

    expect(result).toMatchObject({
      state: 'WA',
      sort: { field: 'name', direction: 'asc' },
      isSearching: false,
      isFiltering: false,
    })

    expect(result).not.toHaveProperty('latitude')
    expect(result).not.toHaveProperty('longitude')
    expect(result).not.toHaveProperty('radius_miles')
  })

  it('prefers explicit viewport bounds over center-radius params', () => {
    const result = buildResourcesQueryOptions({
      lat: '47.7510741',
      lng: '-120.7401386',
      distance: '25',
      north: '48.2',
      south: '47.4',
      east: '-121.5',
      west: '-122.7',
    })

    expect(result).toMatchObject({
      north: 48.2,
      south: 47.4,
      east: -121.5,
      west: -122.7,
      sort: { field: 'name', direction: 'asc' },
    })

    expect(result).not.toHaveProperty('latitude')
    expect(result).not.toHaveProperty('longitude')
    expect(result).not.toHaveProperty('radius_miles')
  })
})
