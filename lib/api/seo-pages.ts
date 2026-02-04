/**
 * SEO Pages API
 * Generates city/category matrix from actual database content
 * Only creates pages where we have meaningful content (5+ resources)
 */

import { sql } from '@/lib/db/client'
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
  // Get cities with 5+ active resources
  const validCities = await sql<{ city: string; state: string; count: number }[]>`
    SELECT city, state, COUNT(*)::int as count FROM resources
    WHERE status = 'active' AND city IS NOT NULL AND state IS NOT NULL
    GROUP BY city, state
    HAVING COUNT(*) >= 5
    ORDER BY count DESC
  `

  if (!validCities || validCities.length === 0) {
    return []
  }

  // Get detailed data for each valid city
  const cityPages: CityPageData[] = []

  for (const { city, state } of validCities) {
    // Get all resources in this city
    const cityResources = await sql<
      {
        id: string
        name: string
        primary_category: string
        rating_average: number | null
        created_at: string
      }[]
    >`
      SELECT id, name, primary_category, rating_average, created_at FROM resources
      WHERE city = ${city} AND state = ${state} AND status = 'active'
    `

    if (!cityResources || cityResources.length < 5) continue

    // Calculate category counts
    const categoryCounts = cityResources.reduce(
      (acc, resource) => {
        const category = resource.primary_category as ResourceCategory
        acc[category] = (acc[category] || 0) + 1
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
  const resources = await sql<
    {
      id: string
      name: string
      city: string
      state: string
      primary_category: string
      rating_average: number | null
    }[]
  >`
    SELECT id, name, city, state, primary_category, rating_average FROM resources
    WHERE status = 'active' AND city IS NOT NULL AND state IS NOT NULL
  `

  if (!resources || resources.length === 0) {
    return []
  }

  // Group by city/category
  type ResourceRow = {
    id: string
    name: string
    city: string
    state: string
    primary_category: string
    rating_average: number | null
  }
  const grouped = resources.reduce(
    (acc, resource) => {
      const key = `${resource.city}|${resource.state}|${resource.primary_category}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(resource)
      return acc
    },
    {} as Record<string, ResourceRow[]>
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
