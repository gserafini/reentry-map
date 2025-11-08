/**
 * SEO Pages API
 * Generates city/category matrix from actual database content
 * Only creates pages where we have meaningful content (5+ resources)
 */

import { createClient } from '@/lib/supabase/server'
import type { ResourceCategory } from '@/lib/types/database'

export interface CityPageData {
  city: string
  state: string
  slug: string // e.g., "oakland-ca"
  totalResources: number
  categoryCounts: Record<ResourceCategory, number>
  topRatedResourceId?: string
  topRatedResourceName?: string
  topRatedResourceRating?: number
  newestResourceId?: string
  newestResourceName?: string
  newestResourceDate?: string
}

export interface CategoryInCityPageData {
  city: string
  state: string
  category: ResourceCategory
  slug: string // e.g., "oakland-ca/employment"
  resourceCount: number
  topRatedResourceId?: string
  topRatedResourceName?: string
  topRatedResourceRating?: number
}

/**
 * Get all cities that have enough resources to warrant a hub page
 * Threshold: 5+ total resources
 */
export async function getCityPages(): Promise<CityPageData[]> {
  const supabase = await createClient()

  // Get city totals
  const { data: cityTotals, error: cityError } = await supabase
    .from('resources')
    .select('city, state')
    .eq('status', 'active')
    .not('city', 'is', null)
    .not('state', 'is', null)

  if (cityError || !cityTotals) {
    console.error('Error fetching city totals:', cityError)
    return []
  }

  // Count resources per city
  const cityCounts = cityTotals.reduce(
    (acc, resource) => {
      const key = `${resource.city}|${resource.state}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Filter cities with 5+ resources
  const validCities = Object.entries(cityCounts)
    .filter(([_, count]) => count >= 5)
    .map(([key]) => {
      const [city, state] = key.split('|')
      return { city, state }
    })

  // Get detailed data for each valid city
  const cityPages: CityPageData[] = []

  for (const { city, state } of validCities) {
    // Get all resources in this city
    const { data: cityResources } = await supabase
      .from('resources')
      .select('id, name, primary_category, rating_average, created_at')
      .eq('city', city)
      .eq('state', state)
      .eq('status', 'active')

    if (!cityResources || cityResources.length < 5) continue

    // Calculate category counts
    const categoryCounts = cityResources.reduce(
      (acc, resource) => {
        acc[resource.primary_category] = (acc[resource.primary_category] || 0) + 1
        return acc
      },
      {} as Record<ResourceCategory, number>
    )

    // Find top rated resource
    const topRated = cityResources
      .filter((r) => r.rating_average && r.rating_average > 0)
      .sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0))[0]

    // Find newest resource
    const newest = [...cityResources].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    const slug = `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`

    cityPages.push({
      city,
      state,
      slug,
      totalResources: cityResources.length,
      categoryCounts,
      topRatedResourceId: topRated?.id,
      topRatedResourceName: topRated?.name,
      topRatedResourceRating: topRated?.rating_average || undefined,
      newestResourceId: newest?.id,
      newestResourceName: newest?.name,
      newestResourceDate: newest?.created_at,
    })
  }

  return cityPages.sort((a, b) => b.totalResources - a.totalResources)
}

/**
 * Get all category/city combinations that have enough resources
 * Threshold: 3+ resources in that category/city combo
 */
export async function getCategoryInCityPages(): Promise<CategoryInCityPageData[]> {
  const supabase = await createClient()

  const { data: resources, error } = await supabase
    .from('resources')
    .select('id, name, city, state, primary_category, rating_average')
    .eq('status', 'active')
    .not('city', 'is', null)
    .not('state', 'is', null)

  if (error || !resources) {
    console.error('Error fetching resources for category pages:', error)
    return []
  }

  // Group by city/category
  const grouped = resources.reduce(
    (acc, resource) => {
      const key = `${resource.city}|${resource.state}|${resource.primary_category}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(resource)
      return acc
    },
    {} as Record<string, typeof resources>
  )

  // Build pages for combinations with 3+ resources
  const pages: CategoryInCityPageData[] = []

  for (const [key, cityResources] of Object.entries(grouped)) {
    if (cityResources.length < 3) continue

    const [city, state, category] = key.split('|') as [string, string, ResourceCategory]

    // Find top rated in this category
    const topRated = cityResources
      .filter((r) => r.rating_average && r.rating_average > 0)
      .sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0))[0]

    const citySlug = `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`
    const slug = `${citySlug}/${category}`

    pages.push({
      city,
      state,
      category,
      slug,
      resourceCount: cityResources.length,
      topRatedResourceId: topRated?.id,
      topRatedResourceName: topRated?.name,
      topRatedResourceRating: topRated?.rating_average || undefined,
    })
  }

  return pages.sort((a, b) => b.resourceCount - a.resourceCount)
}

/**
 * Get data for a specific city hub page
 */
export async function getCityPageData(city: string, state: string): Promise<CityPageData | null> {
  const pages = await getCityPages()
  return pages.find((p) => p.city === city && p.state === state) || null
}

/**
 * Get data for a specific category in city page
 */
export async function getCategoryInCityPageData(
  city: string,
  state: string,
  category: ResourceCategory
): Promise<CategoryInCityPageData | null> {
  const pages = await getCategoryInCityPages()
  return pages.find((p) => p.city === city && p.state === state && p.category === category) || null
}

/**
 * Parse city-state slug to components
 * Example: "oakland-ca" -> { city: "Oakland", state: "CA" }
 */
export function parseCitySlug(slug: string): { city: string; state: string } | null {
  const parts = slug.split('-')
  if (parts.length < 2) return null

  const state = parts[parts.length - 1].toUpperCase()
  const city = parts
    .slice(0, -1)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return { city, state }
}
