import { describe, expect, it } from 'vitest'
import { buildResourcesQueryOptions } from '@/app/resources/params'
import { parseSortParam } from '@/lib/utils/sort'
describe('search order and tags', () => {
  it('uses Recommended for query searches and respects an explicit alternative order', () => {
    expect(
      buildResourcesQueryOptions({ search: 'housing', lat: '32.7', lng: '-96.8' }).sort
    ).toEqual({ field: 'relevance', direction: 'asc' })
    expect(buildResourcesQueryOptions({ search: 'housing', sort: 'name-asc' }).sort).toEqual({
      field: 'name',
      direction: 'asc',
    })
    expect(parseSortParam('relevance')).toEqual({ field: 'relevance', direction: 'asc' })
  })
  it('keeps distance/name defaults for browsing without a search term', () => {
    expect(buildResourcesQueryOptions({ lat: '32.7', lng: '-96.8' }).sort.field).toBe('distance')
    expect(buildResourcesQueryOptions({}).sort.field).toBe('name')
  })
  it('carries tag filters through the same resources and counts query options', () => {
    expect(buildResourcesQueryOptions({ tags: 'veterans, family,veterans' })).toMatchObject({
      tags: ['veterans', 'family'],
      isFiltering: true,
    })
  })
})
