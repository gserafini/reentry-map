import type { MetadataRoute } from 'next'
import { getAllCategories } from '@/lib/utils/categories'
import {
  generateResourceUrl,
  generateCityUrl,
  generateStateUrl,
  generateCategoryInCityUrl,
} from '@/lib/utils/urls'
import type { ResourceCategory } from '@/lib/types/database'

export interface SitemapResource {
  id: string
  name: string
  city: string | null
  state: string | null
  slug: string | null
  primary_category: string
  updated_at: string | Date | null
  created_at: string | Date | null
}
const origin = 'https://reentrymap.org'
function modified(rows: SitemapResource[]): Date | undefined {
  const stamps = rows
    .map((row) => new Date(row.updated_at || row.created_at || '').getTime())
    .filter(Number.isFinite)
  return stamps.length ? new Date(Math.max(...stamps)) : undefined
}
/** One inventory, canonical routes only; timestamps describe content, never request time. */
export function buildSitemapEntries(resources: SitemapResource[]): MetadataRoute.Sitemap {
  const categories = getAllCategories()
  const pages: MetadataRoute.Sitemap = [
    { url: origin, lastModified: modified(resources), changeFrequency: 'daily', priority: 1 },
    ...['suggest-resource', 'about', 'methodology'].map((path) => ({ url: `${origin}/${path}` })),
    ...categories.map((category) => ({
      url: `${origin}/category/${category}`,
      lastModified: modified(resources.filter((row) => row.primary_category === category)),
    })),
  ]
  const states = new Map<string, SitemapResource[]>()
  const cities = new Map<string, SitemapResource[]>()
  const paths = new Map<string, SitemapResource[]>()
  for (const row of resources) {
    if (!row.city?.trim() || !row.state || !/^[A-Za-z]{2}$/.test(row.state)) continue
    const state = row.state.toUpperCase()
    const cityKey = generateCityUrl(row.city, state)
    states.set(state, [...(states.get(state) || []), row])
    cities.set(cityKey, [...(cities.get(cityKey) || []), row])
    const path = generateResourceUrl(row)
    paths.set(path, [...(paths.get(path) || []), row])
  }
  for (const [state, rows] of states)
    pages.push({ url: origin + generateStateUrl(state), lastModified: modified(rows) })
  for (const [cityPath, rows] of cities) {
    if (rows.length >= 5) pages.push({ url: origin + cityPath, lastModified: modified(rows) })
    for (const category of categories) {
      const matching = rows.filter((row) => row.primary_category === category)
      if (matching.length >= 3)
        pages.push({
          url:
            origin +
            generateCategoryInCityUrl(rows[0].city!, rows[0].state!, category as ResourceCategory),
          lastModified: modified(matching),
        })
    }
  }
  for (const [path, rows] of paths)
    if (rows.length === 1) pages.push({ url: origin + path, lastModified: modified(rows) })
  return [...new Map(pages.map((page) => [page.url, page])).values()]
}
