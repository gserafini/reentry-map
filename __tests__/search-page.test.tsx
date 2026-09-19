import { beforeEach, describe, expect, it, vi } from 'vitest'
import SearchPage from '@/app/search/page'
import { getResources, getResourcesCount } from '@/lib/api/resources'

vi.mock('@/lib/api/resources', () => ({
  getResources: vi.fn(async () => ({ data: [], error: null })),
  getResourcesCount: vi.fn(async () => ({ data: 0, error: null })),
  getCategoryCounts: vi.fn(async () => ({ data: {}, error: null })),
}))
vi.mock('@/components/search/ResultsExplorer', () => ({ ResultsExplorer: () => null }))
vi.mock('@/components/search/SearchPageHeader', () => ({ SearchPageHeader: () => null }))
vi.mock('@/lib/utils/search-intent', () => ({ interpretSearch: () => ({ label: null }) }))

describe('search result scope', () => {
  beforeEach(() => vi.clearAllMocks())
  it('uses selected categories and the same location for rows and total', async () => {
    await SearchPage({
      searchParams: Promise.resolve({
        search: 'housing',
        categories: 'housing',
        locationName: 'Dallas, TX',
        lat: '32.7',
        lng: '-96.8',
        distance: '25',
      }),
    })
    const options = expect.objectContaining({
      categories: ['housing'],
      locationName: 'Dallas, TX',
      latitude: 32.7,
      longitude: -96.8,
      radius_miles: 25,
    })
    expect(getResources).toHaveBeenCalledWith(options)
    expect(getResourcesCount).toHaveBeenCalledWith(options)
  })
  it('never replaces an empty local result with unbounded national results', async () => {
    await SearchPage({
      searchParams: Promise.resolve({ search: '7More', lat: '32.7', lng: '-96.8', distance: '25' }),
    })
    expect(getResources).toHaveBeenCalledTimes(1)
    expect(getResources).toHaveBeenCalledWith(expect.objectContaining({ radius_miles: 25 }))
  })
})
