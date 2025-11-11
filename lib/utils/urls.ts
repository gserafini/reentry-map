/**
 * URL Generation & Parsing Utilities
 * Single source of truth for all URL patterns in the app
 */

import type { Resource, ResourceCategory } from '@/lib/types/database'

/**
 * Generate city slug from city name
 * Example: "San Francisco" -> "san-francisco"
 */
export function generateCitySlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Generate state slug from state code
 * Example: "CA" -> "ca"
 */
export function generateStateSlug(state: string): string {
  return state.toLowerCase()
}

/**
 * Parse city slug to city name
 * Example: "san-francisco" -> "San Francisco"
 */
export function parseCitySlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Parse state slug to state code
 * Example: "ca" -> "CA"
 */
export function parseStateSlug(slug: string): string {
  return slug.toUpperCase()
}

/**
 * @deprecated Use generateCitySlug and generateStateSlug separately
 * Generate city-state slug from city and state (legacy)
 * Example: "Oakland", "CA" -> "oakland-ca"
 */
export function generateCityStateSlug(city: string, state: string): string {
  const citySlug = generateCitySlug(city)
  const stateSlug = generateStateSlug(state)
  return `${citySlug}-${stateSlug}`
}

/**
 * @deprecated Use parseCitySlug and parseStateSlug separately
 * Parse city-state slug to components (legacy)
 * Example: "oakland-ca" -> { city: "Oakland", state: "CA" }
 */
export function parseCityStateSlug(slug: string): { city: string; state: string } | null {
  const parts = slug.split('-')
  if (parts.length < 2) return null

  const state = parts[parts.length - 1].toUpperCase()
  const city = parts
    .slice(0, -1)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return { city, state }
}

/**
 * Generate resource slug from resource name
 * Example: "Oakland Job Center" -> "oakland-job-center"
 */
export function generateResourceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .trim()
    .slice(0, 100) // Reasonable limit
}

/**
 * Generate tag slug from tag name
 * Example: "Veterans Services" -> "veterans-services"
 */
export function generateTagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .trim()
}

/**
 * Generate full resource URL
 * Pattern: /{state}/{city}/{resource-slug}
 * Example: /ca/oakland/oakland-job-center
 */
export function generateResourceUrl(
  resource: Pick<Resource, 'id' | 'name' | 'city' | 'state'>
): string {
  if (!resource.city || !resource.state) {
    // Fallback to short URL if no location
    return `/r/${resource.id}`
  }

  const stateSlug = generateStateSlug(resource.state)
  const citySlug = generateCitySlug(resource.city)
  const resourceSlug = generateResourceSlug(resource.name)

  return `/${stateSlug}/${citySlug}/${resourceSlug}`
}

/**
 * Generate state landing page URL
 * Pattern: /{state}
 * Example: /ca
 */
export function generateStateUrl(state: string): string {
  return `/${generateStateSlug(state)}`
}

/**
 * Generate city hub URL
 * Pattern: /{state}/{city}
 * Example: /ca/oakland
 */
export function generateCityUrl(city: string, state: string): string {
  const stateSlug = generateStateSlug(state)
  const citySlug = generateCitySlug(city)
  return `/${stateSlug}/${citySlug}`
}

/**
 * Generate national category URL
 * Pattern: /category/{category}
 * Example: /category/employment
 */
export function generateNationalCategoryUrl(category: ResourceCategory): string {
  return `/category/${category}`
}

/**
 * Generate category in city URL (local pre-filtered)
 * Pattern: /{state}/{city}/category/{category}
 * Example: /ca/oakland/category/employment
 */
export function generateCategoryInCityUrl(
  city: string,
  state: string,
  category: ResourceCategory
): string {
  const stateSlug = generateStateSlug(state)
  const citySlug = generateCitySlug(city)
  return `/${stateSlug}/${citySlug}/category/${category}`
}

/**
 * Generate national tag URL
 * Pattern: /tag/{tag}
 * Example: /tag/veterans-services
 */
export function generateNationalTagUrl(tag: string): string {
  const tagSlug = generateTagSlug(tag)
  return `/tag/${tagSlug}`
}

/**
 * Generate tag in city URL (local pre-filtered)
 * Pattern: /{state}/{city}/tag/{tag}
 * Example: /ca/oakland/tag/veterans-services
 */
export function generateTagInCityUrl(city: string, state: string, tag: string): string {
  const stateSlug = generateStateSlug(state)
  const citySlug = generateCitySlug(city)
  const tagSlug = generateTagSlug(tag)
  return `/${stateSlug}/${citySlug}/tag/${tagSlug}`
}

/**
 * Generate short resource URL (for QR codes, redirects, backward compatibility)
 * Pattern: /r/{id}
 * Example: /r/abc123
 */
export function generateShortResourceUrl(id: string): string {
  return `/r/${id}`
}

/**
 * Parse resource URL to extract state, city, and resource slug
 * Handles: /{state}/{city}/{resource-slug}
 * Returns: { state, city, resourceSlug } or null
 */
export function parseResourceUrl(pathname: string): {
  state: string
  city: string
  resourceSlug: string
} | null {
  const parts = pathname.split('/').filter(Boolean)

  // Format: /{state}/{city}/{resource-slug}
  if (parts.length === 3) {
    const [stateSlug, citySlug, resourceSlug] = parts
    // Validate format (state must be 2 letters)
    if (/^[a-z]{2}$/.test(stateSlug)) {
      return {
        state: parseStateSlug(stateSlug),
        city: parseCitySlug(citySlug),
        resourceSlug,
      }
    }
  }

  return null
}

/**
 * Legacy URL patterns for redirects
 */

/**
 * Parse old search URL pattern: /search/{category}-in-{city}-{state}
 * Example: /search/employment-in-oakland-ca
 */
export function parseOldSearchUrl(pathname: string): {
  category: string
  city: string
  state: string
} | null {
  const match = pathname.match(/^\/search\/(.+)-in-(.+)-([a-z]{2})$/i)
  if (!match) return null

  const [, category, citySlug, state] = match
  const city = citySlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return { category, city, state: state.toUpperCase() }
}

/**
 * Parse old resource URL patterns
 * Handles:
 * - /resources/{id}
 * - /resources/{name-slug}/{id}
 * - /resources/{state}/{city}/{slug}
 */
export function parseOldResourceUrl(pathname: string): { id?: string; slug?: string } | null {
  const parts = pathname.split('/').filter(Boolean)

  if (parts[0] !== 'resources') return null

  // Pattern: /resources/{id}
  if (parts.length === 2) {
    return { id: parts[1] }
  }

  // Pattern: /resources/{name-slug}/{id}
  if (parts.length === 3) {
    return { id: parts[2] }
  }

  // Pattern: /resources/{state}/{city}/{slug}
  if (parts.length === 4) {
    return { slug: parts[3] }
  }

  return null
}
