import type { Resource } from '@/lib/types/database'
import { MetadataRoute } from 'next'
import { getCityPages, getCategoryInCityPages } from '@/lib/api/seo-pages'
import { createStaticClient } from '@/lib/supabase/server'
import { generateSeoUrl } from '@/lib/utils/seo-url'

/**
 * Dynamic Sitemap Generation
 * Automatically generates sitemap from database content
 * Updates as new resources and cities are added
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://reentrymap.org'
  const supabase = createStaticClient()

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
    {
      url: `${baseUrl}/favorites`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]

  // City hub pages (e.g., /oakland-ca)
  const cityPages = await getCityPages()
  const cityPagesSitemap: MetadataRoute.Sitemap = cityPages.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  // Category in city pages (e.g., /oakland-ca/employment)
  const categoryPages = await getCategoryInCityPages()
  const categoryPagesSitemap: MetadataRoute.Sitemap = categoryPages.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Individual resource pages
  const { data: resources } = await supabase
    .from('resources')
    .select('id, name, updated_at, created_at')
    .eq('status', 'active')
    .limit(1000)

  const resourcePagesSitemap: MetadataRoute.Sitemap =
    resources?.map((resource) => ({
      url: `${baseUrl}${generateSeoUrl({ id: resource.id, name: resource.name } as Resource)}`,
      lastModified: new Date(resource.updated_at || resource.created_at || Date.now()),
      changeFrequency: 'monthly',
      priority: 0.7,
    })) || []

  return [...staticPages, ...cityPagesSitemap, ...categoryPagesSitemap, ...resourcePagesSitemap]
}
