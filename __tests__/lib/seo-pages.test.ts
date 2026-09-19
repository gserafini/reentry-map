// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  queries: [] as { text: string; values: unknown[] }[],
}))
vi.mock('@/lib/db/client', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?')
    fixture.queries.push({ text, values })
    if (text.includes('GROUP BY city, state')) {
      return Promise.resolve([{ city: 'Dallas', state: 'TX', count: fixture.rows.length }])
    }
    const rows = text.includes('LOWER(city)')
      ? fixture.rows.filter(
          (row) => String(row.city).toLowerCase() === String(values[0]).toLowerCase()
        )
      : text.includes('WHERE city =')
        ? fixture.rows.filter((row) => row.city === values[0])
        : fixture.rows
    return Promise.resolve(rows)
  },
}))
import { getCityPageData, getCategoryInCityPageData } from '@/lib/api/seo-pages'

const resource = (id: number) => ({
  id: String(id),
  name: 'Resource ' + id,
  city: 'Dallas',
  state: 'TX',
  primary_category: 'general-support',
  categories: ['general-support', 'employment'],
  rating_average: id,
  created_at: '2026-09-' + String(10 + id).padStart(2, '0') + 'T00:00:00Z',
})
describe('bounded city SEO lookups', () => {
  beforeEach(() => {
    fixture.rows = Array.from({ length: 5 }, (_, i) => resource(i + 1))
    fixture.queries = []
  })
  it('loads only the requested city with one parameterized query', async () => {
    const result = await getCityPageData('Dallas', 'TX')
    expect(result).toMatchObject({
      city: 'Dallas',
      state: 'TX',
      totalResources: 5,
      categoryCounts: { 'general-support': 5, employment: 5 },
      topRatedResourceId: '5',
      newestResourceId: '5',
    })
    expect(fixture.queries).toHaveLength(1)
    expect(fixture.queries[0].text).toMatch(
      /WHERE LOWER\(city\) = LOWER\(\?\) AND state = \? AND status = 'active'/
    )
    expect(fixture.queries[0].values).toEqual(['Dallas', 'TX'])
  })
  it('keeps directory links to cities with one resource usable', async () => {
    fixture.rows = fixture.rows.slice(0, 1)
    expect(await getCityPageData('Dallas', 'TX')).toMatchObject({ totalResources: 1 })
  })
  it('resolves mixed-case city names after slug parsing', async () => {
    fixture.rows = [{ ...resource(1), city: 'McAllen' }]
    expect(await getCityPageData('Mcallen', 'TX')).toMatchObject({ totalResources: 1 })
    expect(await getCategoryInCityPageData('Mcallen', 'TX', 'employment')).toMatchObject({
      resourceCount: 1,
    })
  })
  it('returns no city page when there are no active resources', async () => {
    fixture.rows = []
    expect(await getCityPageData('Dallas', 'TX')).toBeNull()
  })
  it('loads one city category including secondary categories without scanning other cities', async () => {
    fixture.rows = fixture.rows.slice(0, 3)
    const result = await getCategoryInCityPageData('Dallas', 'TX', 'employment')
    expect(result).toMatchObject({
      city: 'Dallas',
      state: 'TX',
      category: 'employment',
      resourceCount: 3,
      topRatedResourceId: '3',
    })
    expect(fixture.queries).toHaveLength(1)
    expect(fixture.queries[0].text).toMatch(
      /WHERE LOWER\(city\) = LOWER\(\?\) AND state = \? AND status = 'active'/
    )
    expect(fixture.queries[0].text).toContain('ANY(categories)')
    expect(fixture.queries[0].values).toEqual(['Dallas', 'TX', 'employment', 'employment'])
  })
  it('keeps a category with one active resource usable', async () => {
    fixture.rows = fixture.rows.slice(0, 1)
    expect(await getCategoryInCityPageData('Dallas', 'TX', 'employment')).toMatchObject({
      resourceCount: 1,
    })
  })
  it('returns no category page when there are no matching active resources', async () => {
    fixture.rows = []
    expect(await getCategoryInCityPageData('Dallas', 'TX', 'employment')).toBeNull()
  })
})
