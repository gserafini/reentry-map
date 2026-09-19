import { describe, expect, it, vi, beforeEach } from 'vitest'

const fixture = vi.hoisted(() => ({
  queries: [] as string[],
  services: [
    {
      id: 'hawaii-from-texas',
      city: 'Dallas',
      state: 'TX',
      service_area: { type: 'statewide', values: ['Hawaii'] },
    },
    {
      id: 'texas-from-hawaii',
      city: 'Honolulu',
      state: 'HI',
      service_area: { type: 'statewide', values: ['Texas'] },
    },
    {
      id: 'dallas-county',
      city: 'Dallas',
      state: 'TX',
      service_area: { type: 'county', values: ['Dallas County'] },
    },
    { id: 'unknown-dallas', city: 'Dallas', state: 'TX', service_area: null },
    { id: 'unknown-lubbock', city: 'Lubbock', state: 'TX', service_area: null },
    { id: 'unknown-georgia', city: 'Dallas', state: 'GA', service_area: null },
    {
      id: 'national-service',
      city: 'Los Angeles',
      state: 'CA',
      service_area: { type: 'nationwide', values: ['USA'] },
    },
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
          resolve(text.includes('service_area FROM resources') ? fixture.services : [])
        },
      }
    },
    { unsafe: (value: string) => value }
  )
  return { sql: tag }
})
vi.mock('@/lib/server/search-geography', () => ({
  resolveSearchGeography: (
    name: string,
    _lat: number,
    _lng: number,
    _state: string,
    city: string
  ) => ({
    state: 'TX',
    stateName: 'Texas',
    city: city || (name.includes('Dallas') ? 'Dallas' : undefined),
    county: 'Dallas',
  }),
}))
import { getResourcesForMap } from '@/lib/api/resources'

describe('state browse uses service coverage, not the map anchor', () => {
  beforeEach(() => {
    fixture.queries = []
  })
  it('includes Texas local records but excludes explicitly Hawaii-only coverage anchored in Texas', async () => {
    await getResourcesForMap({ state: 'TX', locationName: 'Texas' })
    const query = fixture.queries.find((text) => text.includes('SELECT id,name,primary_category'))
    expect(query).toContain('texas-from-hawaii')
    expect(query).toContain('dallas-county')
    expect(query).toContain('national-service')
    expect(query).toContain('unknown-dallas')
    expect(query).toContain('unknown-lubbock')
    expect(query).not.toContain('hawaii-from-texas')
    expect(query).not.toContain('unknown-georgia')
  })
  it('keeps unknown service-area records in their declared city without radius-based guessing', async () => {
    await getResourcesForMap({
      latitude: 32.7767,
      longitude: -96.797,
      radius_miles: 25,
      locationName: 'Dallas, TX, USA',
    })
    const query = fixture.queries.find((text) => text.includes('SELECT id,name,primary_category'))
    expect(query).toContain('unknown-dallas')
    expect(query).not.toContain('unknown-lubbock')
    expect(query).not.toContain('unknown-georgia')
    expect(query).not.toContain('hawaii-from-texas')
  })
})
