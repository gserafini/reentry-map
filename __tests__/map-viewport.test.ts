import { describe, expect, it } from 'vitest'

import { buildViewportUrl, parseViewportBounds } from '@/lib/utils/map-viewport'

describe('map viewport helpers', () => {
  it('builds a sharable viewport URL and clears center-radius params', () => {
    const existing = new URLSearchParams(
      'search=housing&lat=47.7510741&lng=-120.7401386&distance=25&page=3&sort=distance-asc&locationName=Washington%2C+USA'
    )

    const url = buildViewportUrl(
      '/resources',
      existing,
      {
        north: 47.1234567,
        south: 46.1234567,
        east: -121.1234567,
        west: -122.1234567,
      },
      'Map view'
    )

    expect(url).toBe(
      '/resources?search=housing&locationName=Map+view&north=47.123457&south=46.123457&east=-121.123457&west=-122.123457'
    )
  })

  it('parses viewport bounds from URL params', () => {
    const bounds = parseViewportBounds(
      new URLSearchParams('north=48.1&south=47.9&east=-121.8&west=-122.4')
    )

    expect(bounds).toEqual({
      north: 48.1,
      south: 47.9,
      east: -121.8,
      west: -122.4,
    })
  })
})
