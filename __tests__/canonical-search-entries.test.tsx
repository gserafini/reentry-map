import { beforeEach, describe, expect, it, vi } from 'vitest'
import HyperlocalSearchPage from '@/app/search/[slug]/page'
import TagPage from '@/app/tag/[tag]/page'
import TagInCityPage from '@/app/[state]/[city]/tag/[tag]/page'
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(url)
  })
)
vi.mock('next/navigation', () => ({
  redirect,
  notFound: () => {
    throw new Error('not-found')
  },
}))
vi.mock('@/lib/api/resources', () => ({
  getResources: vi.fn(async () => ({ data: [], error: null })),
  getResourcesCount: vi.fn(async () => ({ data: 0, error: null })),
  getCategoryCounts: vi.fn(async () => ({ data: {}, error: null })),
}))
vi.mock('@/components/resources/ResourceList', () => ({ ResourceList: () => null }))
vi.mock('@/components/map/ResourceMapWithLocation', () => ({ ResourceMapWithLocation: () => null }))

describe('canonical public search entries', () => {
  beforeEach(() => vi.clearAllMocks())
  it('keeps hyperlocal slug scope and category on the shared results route', async () => {
    await expect(
      HyperlocalSearchPage({
        params: Promise.resolve({ slug: 'housing-in-dallas-tx' }),
        searchParams: Promise.resolve({ page: '2', sort: 'name-asc' }),
      })
    ).rejects.toThrow('/resources?')
    const url = new URL(redirect.mock.calls[0][0], 'https://reentrymap.org')
    expect(url.pathname).toBe('/resources')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      city: 'dallas',
      state: 'TX',
      categories: 'housing',
      page: '2',
      sort: 'name-asc',
    })
  })
  it('keeps national tag and requested search filters', async () => {
    await expect(
      TagPage({
        params: Promise.resolve({ tag: 'veterans' }),
        searchParams: Promise.resolve({ search: 'jobs', sort: 'name-asc' }),
      })
    ).rejects.toThrow('/resources?')
    const url = new URL(redirect.mock.calls[0][0], 'https://reentrymap.org')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      tags: 'veterans',
      search: 'jobs',
      sort: 'name-asc',
    })
  })
  it('keeps city tag scope without an SEO minimum-resource threshold', async () => {
    await expect(
      TagInCityPage({
        params: Promise.resolve({ state: 'tx', city: 'dallas', tag: 'veterans' }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('/resources?')
    const url = new URL(redirect.mock.calls[0][0], 'https://reentrymap.org')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      tags: 'veterans',
      city: 'Dallas',
      state: 'TX',
    })
  })
})
