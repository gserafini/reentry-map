// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({ queries: [] as string[] }))

vi.mock('@/lib/db/client', () => ({
  sql: (strings: TemplateStringsArray) => {
    const query = strings.join('?')
    fixture.queries.push(query)
    if (query.includes('FROM county_data')) return Promise.resolve([{ fips_code: '06001' }])
    if (query.includes('find_county_for_point')) {
      return Promise.reject(
        new Error('function find_county_for_point(unknown, unknown) does not exist')
      )
    }
    return Promise.resolve([])
  },
}))

import { determineCounty, determineCountyFromCoordinates } from '@/lib/utils/county'
import { findCountyForCoordinates, getCountyFeatures } from '@/lib/server/county-geometry.mjs'

const pilotPoints = [
  { latitude: 36.0838597, longitude: -79.8846491, county: 'Guilford', fips: '37081' },
  { latitude: 35.9894727, longitude: -83.9601417, county: 'Knox', fips: '47093' },
  { latitude: 27.7388411, longitude: -97.4524176, county: 'Nueces', fips: '48355' },
  { latitude: 26.2911252, longitude: -98.1517643, county: 'Hidalgo', fips: '48215' },
]

describe('county coordinate lookup', () => {
  beforeEach(() => {
    fixture.queries = []
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it.each(pilotPoints)(
    'resolves $county by polygon and FIPS',
    async ({ latitude, longitude, county, fips }) => {
      await expect(determineCountyFromCoordinates(latitude, longitude)).resolves.toEqual({
        county,
        county_fips: fips,
        method: 'coordinates',
      })
      expect(fixture.queries).toEqual([])
    }
  )

  it('uses one cached boundary set and honors optional state filtering', () => {
    const features = getCountyFeatures()
    expect(getCountyFeatures()).toBe(features)
    expect(findCountyForCoordinates(26.2911252, -98.1517643, 'TX')).toMatchObject({
      county_name: 'Hidalgo',
      state_code: 'TX',
      fips_code: '48215',
    })
    expect(findCountyForCoordinates(26.2911252, -98.1517643, 'CA')).toBeNull()
    expect(findCountyForCoordinates(0, 0)).toBeNull()
  })

  it('uses the polygon fallback through the hybrid API when county name is missing', async () => {
    await expect(determineCounty(null, 'TX', 26.2911252, -98.1517643)).resolves.toEqual({
      county: 'Hidalgo',
      county_fips: '48215',
      method: 'coordinates',
    })
    expect(fixture.queries).toEqual([])
  })

  it('prefers a county-name FIPS lookup when geocoding already supplied a county', async () => {
    await expect(determineCounty('Alameda', 'ca', 37.8, -122.2)).resolves.toEqual({
      county: 'Alameda',
      county_fips: '06001',
      method: 'fips-lookup',
    })
    expect(fixture.queries).toHaveLength(1)
    expect(fixture.queries[0]).toContain('FROM county_data')
  })

  it.each([
    ['missing coordinates', null, null],
    ['non-finite latitude', Number.NaN, -98.2],
    ['latitude outside bounds', 91, -98.2],
    ['longitude outside bounds', 26.2, 181],
    ['ocean point', 0, 0],
  ])('returns null for %s without querying the database', async (_label, latitude, longitude) => {
    await expect(determineCountyFromCoordinates(latitude, longitude)).resolves.toBeNull()
    expect(fixture.queries).toEqual([])
  })
})
