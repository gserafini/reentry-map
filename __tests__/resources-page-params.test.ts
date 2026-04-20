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
})
