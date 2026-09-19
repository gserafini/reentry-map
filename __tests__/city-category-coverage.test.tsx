import { beforeEach, describe, expect, it, vi } from 'vitest'
import CategoryInCityPage, { generateMetadata } from '@/app/[state]/[city]/category/[category]/page'
import { getResources, getResourcesCount } from '@/lib/api/resources'
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not-found')
  },
}))
vi.mock('@/lib/api/resources', () => ({
  getResources: vi.fn(async () => ({ data: [], error: null })),
  getResourcesCount: vi.fn(async () => ({ data: 1, error: null })),
  getCategoryCounts: vi.fn(async () => ({ data: {}, error: null })),
}))
vi.mock('@/lib/api/seo-pages', () => ({
  getCityPageData: vi.fn(async () => ({ totalResources: 60, categoryCounts: {} })),
  getCategoryInCityPageData: vi.fn(async () => null),
}))
vi.mock('@/components/search/ResultsExplorer', () => ({ ResultsExplorer: () => null }))
vi.mock('@/components/seo/StructuredData', () => ({
  BreadcrumbList: () => null,
  CollectionPage: () => null,
  ItemList: () => null,
}))
const props = () => ({
  params: Promise.resolve({ city: 'dallas', state: 'tx', category: 'housing' }),
  searchParams: Promise.resolve({}),
})
describe('city category coverage', () => {
  beforeEach(() => vi.clearAllMocks())
  it('queries valid city/category combinations even without an anchored category SEO row', async () => {
    await CategoryInCityPage(props())
    expect(getResources).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Dallas', state: 'TX', categories: ['housing'] })
    )
  })
  it('renders an empty category for recovery instead of returning a 404', async () => {
    vi.mocked(getResourcesCount).mockResolvedValueOnce({ data: 0, error: null })
    await expect(CategoryInCityPage(props())).resolves.toBeTruthy()
  })
  it('uses the actual coverage-aware count in metadata', async () => {
    const metadata = await generateMetadata(props())
    expect(metadata.description).toContain('1 housing')
  })
})
