// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveCityCounties } from '@/lib/server/search-geography'
import { matchesServiceCoverage } from '@/lib/utils/service-coverage'

describe('county services in coordinate-free city browse', () => {
  it('includes county programs at known physical locations in the selected city', () => {
    const area = resolveCityCounties({ city: 'Dallas', state: 'TX' }, [
      { latitude: 32.7767, longitude: -96.797 },
    ])
    expect(
      matchesServiceCoverage(
        { state: 'TX', service_area: { type: 'county', values: ['Dallas County'] } },
        area
      )
    ).toBe(true)
    expect(
      matchesServiceCoverage(
        { state: 'TX', service_area: { type: 'county', values: ['Tarrant County'] } },
        area
      )
    ).toBe(false)
  })
  it('retains every observed county and rejects unrelated state coordinates', () => {
    const area = resolveCityCounties({ city: 'Dallas', state: 'TX' }, [
      { latitude: 32.7767, longitude: -96.797 },
      { latitude: 33.0198, longitude: -96.6989 },
      { latitude: 37.8044, longitude: -122.2712 },
    ])
    expect(
      matchesServiceCoverage(
        { state: 'TX', service_area: { type: 'county', values: ['Collin County'] } },
        area
      )
    ).toBe(true)
    expect(area.counties?.map((c) => c.fips)).toEqual(expect.arrayContaining(['48113', '48085']))
    expect(area.counties).toHaveLength(2)
  })
  it('does not invent county coverage without geographic evidence', () => {
    expect(
      resolveCityCounties({ city: 'Unknown', state: 'TX' }, [{ latitude: null, longitude: null }])
        .counties
    ).toEqual([])
  })
})
