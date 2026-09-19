// @vitest-environment node
import { afterAll, describe, expect, it, vi } from 'vitest'
// Integration tests must opt out of the suite-wide database mock.
vi.unmock('@/lib/db/client')
import { config } from 'dotenv'
import {
  getResources,
  getResourcesCount,
  getResourcesForMap,
  getCategoryCounts,
} from '@/lib/api/resources'
import { sql } from '@/lib/db/client'
if (process.env.RUN_SEARCH_INTEGRATION === '1') config({ path: '.env.local', quiet: true })
const dallas = {
  latitude: 32.7767,
  longitude: -96.797,
  radius_miles: 25,
  locationName: 'Dallas, TX, USA',
}
describe.skipIf(process.env.RUN_SEARCH_INTEGRATION !== '1')(
  'staging public search integration',
  () => {
    afterAll(async () => {
      await sql.end()
    })
    it('handles a visitor standing at the exact resource coordinates', async () => {
      const [point] = await sql<{ latitude: number; longitude: number }[]>`
      SELECT latitude,longitude FROM resources
      WHERE status='active' AND COALESCE(address_type,'physical')='physical'
      AND cos(radians(latitude))*cos(radians(latitude))+sin(radians(latitude))*sin(radians(latitude))>1
      LIMIT 1
    `
      expect(point).toBeDefined()
      const result = await getResources({ ...point, radius_miles: 1 })
      expect(result.error).toBeNull()
      expect(result.data![0].distance).toBeLessThan(0.001)
    })
    it('matches jobs and employment to the same usable resources', async () => {
      const [jobs, employment] = await Promise.all([
        getResources({ ...dallas, search: 'jobs', limit: 5000 }),
        getResources({ ...dallas, search: 'employment', limit: 5000 }),
      ])
      expect(jobs.error).toBeNull()
      expect(employment.error).toBeNull()
      expect(jobs.data!.length).toBeGreaterThan(0)
      expect(new Set(jobs.data!.map((r) => r.id))).toEqual(
        new Set(employment.data!.map((r) => r.id))
      )
    })
    it('finds a housing path for an everyday phrase', async () => {
      const result = await getResources({ ...dallas, search: 'I need a place to sleep' })
      expect(result.error).toBeNull()
      expect(result.data!.length).toBeGreaterThan(0)
    })
    it('returns only Texas 7More for Dallas without a nearby fallback', async () => {
      const opts = { ...dallas, search: '7More' }
      const [list, map, count, facets] = await Promise.all([
        getResources(opts),
        getResourcesForMap(opts),
        getResourcesCount(opts),
        getCategoryCounts(opts),
      ])
      for (const result of [list, map, count, facets]) expect(result.error).toBeNull()
      expect(list.data).toHaveLength(1)
      expect(list.data![0].state).toBe('TX')
      expect(list.data![0].distance).toBeUndefined()
      expect(map.data!.map((r) => r.id)).toEqual(list.data!.map((r) => r.id))
      expect(count.data).toBe(1)
      expect(facets.data!['general-support']).toBe(1)
    })
    it('uses category and geographic filters consistently across all outputs', async () => {
      const opts = {
        latitude: 33.5845,
        longitude: -101.8552,
        radius_miles: 25,
        locationName: 'Lubbock, TX, USA',
        search: 'housing',
        categories: ['housing' as const],
        limit: 5000,
      }
      const [list, map, count, facets] = await Promise.all([
        getResources(opts),
        getResourcesForMap(opts),
        getResourcesCount(opts),
        getCategoryCounts(opts),
      ])
      for (const result of [list, map, count, facets]) expect(result.error).toBeNull()
      expect(list.data!.length).toBeGreaterThan(0)
      expect(
        list.data!.every(
          (r) => r.primary_category === 'housing' || r.categories?.includes('housing')
        )
      ).toBe(true)
      expect(count.data).toBe(list.data!.length)
      expect(facets.data!.housing).toBe(list.data!.length)
      expect(new Set(map.data!.map((r) => r.id))).toEqual(new Set(list.data!.map((r) => r.id)))
    })
    it('includes county coverage in city browse without requiring coordinates', async () => {
      const opts = { city: 'Oakland', state: 'CA', limit: 5000 }
      const [list, map, count] = await Promise.all([
        getResources(opts),
        getResourcesForMap(opts),
        getResourcesCount(opts),
      ])
      for (const result of [list, map, count]) expect(result.error).toBeNull()
      expect(list.data!.some((r) => r.name.includes('211') && r.city !== 'Oakland')).toBe(true)
      expect(count.data).toBe(list.data!.length)
      expect(new Set(map.data!.map((r) => r.id))).toEqual(new Set(list.data!.map((r) => r.id)))
    })
    it('honors explicit alphabetical sort before name relevance', async () => {
      const result = await getResources({
        search: 'housing',
        sort: { field: 'name', direction: 'asc' },
        limit: 5000,
      })
      expect(result.error).toBeNull()
      const expected = await sql<
        { id: string }[]
      >`SELECT id FROM resources WHERE id = ANY(${result.data!.map((r) => r.id)}::uuid[]) ORDER BY name ASC,id ASC`
      expect(result.data!.map((r) => r.id)).toEqual(expected.map((r) => r.id))
    })
    it('does not broaden a zero-match search and keeps exact organizations first', async () => {
      const empty = await getResources({ ...dallas, search: 'nonexistent-organization-983127' })
      const exact = await getResources({ ...dallas, search: 'Miles of Freedom' })
      expect(empty.error).toBeNull()
      expect(empty.data).toHaveLength(0)
      expect(exact.error).toBeNull()
      expect(exact.data![0].name).toBe('Miles of Freedom')
    })
  }
)
