import { MetadataRoute } from 'next'
import { getCityPages, getCategoryInCityPages } from '@/lib/api/seo-pages'
import { sql } from '@/lib/db/client'
import {
  generateResourceUrl,
  generateStateUrl,
  generateCityUrl,
  generateCategoryInCityUrl,
  generateNationalCategoryUrl,
  generateNationalTagUrl,
} from '@/lib/utils/urls'
import { getAllCategories } from '@/lib/utils/categories'
import type { ResourceCategory } from '@/lib/types/database'

/**
 * Dynamic Sitemap Generation
 * Automatically generates sitemap from database content
 * Updates as new resources and cities are added
 *
 * URL Structure:
 * - Homepage: /
 * - National category pages: /category/{category}
 * - National tag pages: /tag/{tag}
 * - State landing pages: /{state}
 * - City hubs: /{state}/{city}
 * - Category in city: /{state}/{city}/category/{category}
 * - Tag in city: /{state}/{city}/tag/{tag}
 * - Resources: /{state}/{city}/{resource-slug}
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://reentrymap.org'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/suggest-resource`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // National category pages (e.g., /category/employment)
  const categories = getAllCategories()
  const nationalCategoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}${generateNationalCategoryUrl(category as ResourceCategory)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.95,
  }))

  // National tag pages (e.g., /tag/veterans)
  const tagRows = await sql<{ tags: string[] }[]>`
    SELECT tags FROM resources
    WHERE status = 'active' AND tags IS NOT NULL
  `

  const uniqueTags = [
    ...new Set(
      tagRows
        .flatMap((r) => r.tags || [])
        .filter(Boolean)
        .filter((tag) => tag.trim() !== '')
    ),
  ]

  const nationalTagPages: MetadataRoute.Sitemap = uniqueTags.map((tag) => ({
    url: `${baseUrl}${generateNationalTagUrl(tag)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  // State landing pages (e.g., /ca, /ny)
  const stateRows = await sql<{ state: string }[]>`
    SELECT DISTINCT state FROM resources
    WHERE status = 'active' AND state IS NOT NULL
  `

  const statePagesSitemap: MetadataRoute.Sitemap = stateRows.map((row) => ({
    url: `${baseUrl}${generateStateUrl(row.state)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.95,
  }))

  // City hub pages (e.g., /ca/oakland)
  const cityPages = await getCityPages()
  const cityPagesSitemap: MetadataRoute.Sitemap = cityPages.map((page) => ({
    url: `${baseUrl}${generateCityUrl(page.city, page.state)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  // Category in city pages (e.g., /ca/oakland/category/employment)
  const categoryPages = await getCategoryInCityPages()
  const categoryPagesSitemap: MetadataRoute.Sitemap = categoryPages.map((page) => ({
    url: `${baseUrl}${generateCategoryInCityUrl(page.city, page.state, page.category as ResourceCategory)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Individual resource pages (e.g., /oakland-ca/oakland-job-center)
  const resources = await sql<
    {
      id: string
      name: string
      city: string
      state: string
      updated_at: string | null
      created_at: string
    }[]
  >`
    SELECT id, name, city, state, updated_at, created_at FROM resources
    WHERE status = 'active' AND city IS NOT NULL AND state IS NOT NULL
    LIMIT 10000
  `

  const resourcePagesSitemap: MetadataRoute.Sitemap = resources.map((resource) => ({
    url: `${baseUrl}${generateResourceUrl(resource)}`,
    lastModified: new Date(resource.updated_at || resource.created_at || Date.now()),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [
    ...staticPages,
    ...nationalCategoryPages,
    ...nationalTagPages,
    ...statePagesSitemap,
    ...cityPagesSitemap,
    ...categoryPagesSitemap,
    ...resourcePagesSitemap,
  ]
}
