import type { Metadata } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getResourcesCount } = vi.hoisted(() => ({
  getResourcesCount: vi.fn(async () => ({ data: 42, error: null })),
}))

vi.mock('@/lib/api/resources', () => ({
  getResourcesCount,
  getResources: vi.fn(async () => ({ data: [], error: null })),
  getCategoryCounts: vi.fn(async () => ({ data: {}, error: null })),
}))

vi.mock('@/lib/api/seo-pages', () => ({
  getCityPageData: vi.fn(async () => ({
    city: 'Dallas',
    state: 'TX',
    totalResources: 37,
  })),
}))

vi.mock('@/lib/db/client', () => ({
  sql: vi.fn(async (strings: TemplateStringsArray) => {
    const query = strings.join('')
    if (query.includes('GROUP BY city')) return [{ city: 'Dallas', count: 42 }]
    return [
      {
        id: 'resource-1',
        name: 'Second Chance Employment Center',
        city: 'Dallas',
        state: 'TX',
        description: 'Job training and placement services for people returning home.',
        primary_category: 'employment',
        status: 'active',
      },
    ]
  }),
}))

import { generateMetadata as generateStateMetadata } from '@/app/[state]/page'
import { generateMetadata as generateCityMetadata } from '@/app/[state]/[city]/page'
import { generateMetadata as generateCategoryMetadata } from '@/app/category/[category]/page'
import { generateMetadata as generateCityCategoryMetadata } from '@/app/[state]/[city]/category/[category]/page'
import { generateMetadata as generateResourceMetadata } from '@/app/[state]/[city]/[resource-slug]/page'
import { generateMetadata as generateResourcesMetadata } from '@/app/resources/page'
import { generateMetadata as generateSearchMetadata } from '@/app/search/page'

function imageUrl(metadata: Metadata, network: 'openGraph' | 'twitter'): string {
  const images = metadata[network]?.images
  const first = Array.isArray(images) ? images[0] : images
  if (typeof first === 'string') return first
  if (first instanceof URL) return first.toString()
  return first?.url instanceof URL ? first.url.toString() : String(first?.url || '')
}

describe('landing-page Open Graph metadata', () => {
  beforeEach(() => vi.clearAllMocks())

  it('assigns a distinct, contextual image to each public landing-page type', async () => {
    const state = await generateStateMetadata({ params: Promise.resolve({ state: 'tx' }) })
    const city = await generateCityMetadata({
      params: Promise.resolve({ state: 'tx', city: 'dallas' }),
      searchParams: Promise.resolve({}),
    })
    const category = await generateCategoryMetadata({
      params: Promise.resolve({ category: 'employment' }),
      searchParams: Promise.resolve({}),
    })
    const cityCategory = await generateCityCategoryMetadata({
      params: Promise.resolve({ state: 'tx', city: 'dallas', category: 'employment' }),
      searchParams: Promise.resolve({}),
    })
    const resource = await generateResourceMetadata({
      params: Promise.resolve({
        state: 'tx',
        city: 'dallas',
        'resource-slug': 'second-chance-employment-center',
      }),
    })

    const metadata = { state, city, category, cityCategory, resource }
    const urls = Object.fromEntries(
      Object.entries(metadata).map(([name, value]) => [name, imageUrl(value, 'openGraph')])
    )

    expect(new Set(Object.values(urls))).toHaveLength(5)
    expect(urls.state).toContain('title=Find+reentry+help+in+Texas')
    expect(urls.state).toContain('count=42')
    expect(urls.city).toContain('title=Reentry+resources+in+Dallas%2C+TX')
    expect(urls.cityCategory).toContain('category=employment')
    expect(urls.resource).toContain('title=Second+Chance+Employment+Center')
    expect(urls.resource).toContain('location=Dallas%2C+TX')

    for (const value of Object.values(metadata)) {
      expect(imageUrl(value, 'twitter')).toBe(imageUrl(value, 'openGraph'))
    }
  })

  it('customizes filtered directory and search-result share cards', async () => {
    const resources = await generateResourcesMetadata({
      searchParams: Promise.resolve({
        categories: 'employment',
        locationName: 'Dallas, TX',
        city: 'Dallas',
        state: 'TX',
      }),
    })
    const search = await generateSearchMetadata({
      searchParams: Promise.resolve({ search: 'job', locationName: 'Dallas, TX' }),
    })

    const resourcesUrl = imageUrl(resources, 'openGraph')
    const searchUrl = imageUrl(search, 'openGraph')
    expect(resourcesUrl).toContain('title=Employment+resources+in+Dallas%2C+TX')
    expect(resourcesUrl).toContain('category=employment')
    expect(searchUrl).toContain('title=Employment+support+in+Dallas%2C+TX')
    expect(searchUrl).toContain('category=employment')
    expect(searchUrl).not.toBe(resourcesUrl)
    expect(imageUrl(resources, 'twitter')).toBe(resourcesUrl)
    expect(imageUrl(search, 'twitter')).toBe(searchUrl)
  })
})
