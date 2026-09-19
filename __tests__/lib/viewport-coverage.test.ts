// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const fixture = vi.hoisted(() => ({
  queries: [] as string[],
  physical: [] as {
    id: string
    city: string
    state: string
    latitude: number
    longitude: number
  }[],
  services: [
    {
      id: 'dallas-county',
      state: 'TX',
      service_area: { type: 'county', values: ['Dallas County'] },
    },
    {
      id: 'tarrant-county',
      state: 'TX',
      service_area: { type: 'county', values: ['Tarrant County'] },
    },
    {
      id: 'harris-county',
      state: 'TX',
      service_area: { type: 'county', values: ['Harris County'] },
    },
    { id: 'texas-statewide', state: 'TX', service_area: { type: 'statewide', values: ['Texas'] } },
    {
      id: 'arkansas-statewide',
      state: 'AR',
      service_area: { type: 'statewide', values: ['Arkansas'] },
    },
    { id: 'dallas-city', state: 'TX', service_area: { type: 'city', values: ['Dallas'] } },
  ],
}))
vi.mock('@/lib/db/client', () => {
  const tag = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.reduce(
        (query, part, index) => query + part + (index < values.length ? String(values[index]) : ''),
        ''
      )
      return {
        toString: () => text,
        then: (resolve: (value: unknown) => void) => {
          fixture.queries.push(text)
          resolve(
            text.includes('service_area FROM resources')
              ? fixture.services
              : text.includes("COALESCE(address_type,'physical') = 'physical'")
                ? fixture.physical
                : []
          )
        },
      }
    },
    { unsafe: (value: string) => value }
  )
  return { sql: tag }
})
import { getResourcesForMap } from '@/lib/api/resources'
import { resolveViewportGeographies } from '@/lib/server/search-geography'
const dfw = { north: 33.2, south: 32.4, west: -97.7, east: -96.5 }
describe('viewport service coverage follows polygon intersections', () => {
  beforeEach(() => {
    fixture.queries = []
    fixture.physical = []
  })
  it('includes intersecting counties even with no physical resource or service anchor in view', async () => {
    await getResourcesForMap(dfw)
    const query = fixture.queries.find((text) => text.includes('SELECT id,name,primary_category'))
    expect(query).toContain('dallas-county')
    expect(query).toContain('tarrant-county')
    expect(query).toContain('texas-statewide')
    expect(query).not.toContain('harris-county')
    expect(query).not.toContain('arkansas-statewide')
    expect(query).not.toContain('dallas-city')
  })
  it('keeps physical longitude filtering correct across the antimeridian', async () => {
    await getResourcesForMap({ north: 53, south: 51, west: 170, east: -170 })
    const query = fixture.queries.find((text) =>
      text.includes("COALESCE(address_type,'physical') = 'physical'")
    )
    expect(query).toContain('(longitude >= 170 OR longitude <= -170)')
  })
  it('includes both states when a viewport crosses their boundary', async () => {
    await getResourcesForMap({ north: 33.48, south: 33.37, west: -94.15, east: -93.9 })
    const query = fixture.queries.find((text) => text.includes('SELECT id,name,primary_category'))
    expect(query).toContain('texas-statewide')
    expect(query).toContain('arkansas-statewide')
  })
  it('includes city coverage only when a physical city address establishes overlap', async () => {
    fixture.physical = [
      { id: 'physical-dallas', city: 'Dallas', state: 'TX', latitude: 32.7767, longitude: -96.797 },
    ]
    await getResourcesForMap(dfw)
    const query = fixture.queries.find((text) => text.includes('SELECT id,name,primary_category'))
    expect(query).toContain('dallas-city')
  })
  it('intersects a tiny part of a county without depending on its center', () => {
    const areas = resolveViewportGeographies({
      north: 32.78,
      south: 32.77,
      west: -96.8,
      east: -96.79,
    })
    expect(areas.map((area) => area.countyFips)).toContain('48113')
    expect(areas.map((area) => area.countyFips)).not.toContain('48439')
  })
  it('does not mistake a county bounding box for its actual service polygon', () => {
    // This ocean rectangle lies inside San Francisco County's overall bounding
    // box between its mainland and Farallon Islands, but outside its polygons.
    const areas = resolveViewportGeographies({
      north: 37.74,
      south: 37.73,
      west: -122.86,
      east: -122.85,
    })
    expect(areas.map((area) => area.countyFips)).not.toContain('06075')
  })
  it('rejects invalid bounds and does not turn an ocean-only viewport into state coverage', () => {
    expect(resolveViewportGeographies({ north: 10, south: 20, west: -97, east: -96 })).toEqual([])
    expect(
      resolveViewportGeographies({ north: 30.1, south: 30, west: -140, east: -139.9 })
    ).toEqual([])
  })
})
