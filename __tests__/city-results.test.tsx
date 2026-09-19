import { describe, expect, it, vi } from 'vitest'
import CityPage from '@/app/[state]/[city]/page'
import { getResourcesCount } from '@/lib/api/resources'
vi.mock('@/lib/api/resources', () => ({
  getResources: vi.fn(async () => ({ data: [], error: null })),
  getResourcesCount: vi.fn(async () => ({ data: 4, error: null })),
  getCategoryCounts: vi.fn(async () => ({ data: {}, error: null })),
}))
vi.mock('@/lib/api/seo-pages', () => ({
  getCityPageData: vi.fn(async () => ({ totalResources: 60, categoryCounts: {} })),
}))
vi.mock('@/components/search/ResultsExplorer', () => ({ ResultsExplorer: () => null }))
vi.mock('@/components/seo/StructuredData', () => ({
  BreadcrumbList: () => null,
  CollectionPage: () => null,
  ItemList: () => null,
}))

describe('city results', () => {
  it('counts the selected categories instead of using the unfiltered city total', async () => {
    await CityPage({
      params: Promise.resolve({ city: 'dallas', state: 'tx' }),
      searchParams: Promise.resolve({ categories: 'housing' }),
    })
    expect(getResourcesCount).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Dallas', state: 'TX', categories: ['housing'] })
    )
  })
})
