/**
 * Slug generation utilities for SEO-friendly URLs
 */

/**
 * Convert a string to a URL-friendly slug
 * @param text - The text to convert to a slug
 * @returns A URL-safe slug
 * @example
 * generateSlug("Alameda County Health Services") → "alameda-county-health-services"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Extract state abbreviation from address
 * @param address - Full address string
 * @returns 2-letter state code in lowercase, or null if not found
 * @example
 * extractStateFromAddress("123 Main St, Oakland, CA 94601") → "ca"
 */
export function extractStateFromAddress(address: string | null): string | null {
  if (!address) return null

  // Match common state patterns: ", CA" or " CA " followed by zip
  const stateMatch = address.match(/,\s*([A-Z]{2})(?:\s+\d{5})?/)
  if (stateMatch) {
    return stateMatch[1].toLowerCase()
  }

  return null
}

/**
 * Extract city from address
 * @param address - Address string
 * @returns City name as slug, or null if not found
 * @example
 * extractCityFromAddress("123 Main St, Oakland, CA 94601") → "oakland"
 */
export function extractCityFromAddress(address: string | null): string | null {
  if (!address) return null

  // Extract city from address (between first and second comma)
  const parts = address.split(',').map((p) => p.trim())
  if (parts.length >= 2) {
    // Second part is usually the city
    return generateSlug(parts[1])
  }

  return null
}

/**
 * Generate full SEO-friendly URL path for a resource
 * Uses database fields (slug, state, city) when available, falls back to UUID
 * @param slug - SEO slug from database
 * @param state - State code from database
 * @param city - City slug from database
 * @param fallbackId - UUID to use if SEO fields are missing
 * @returns URL path in format: /resources/[state]/[city]/[slug] or /resources/[id]
 * @example
 * generateResourcePath("alameda-county-health", "ca", "oakland", "uuid")
 * → "/resources/ca/oakland/alameda-county-health"
 * generateResourcePath(null, null, null, "7e1a2f1b-...") → "/resources/7e1a2f1b-..."
 */
export function generateResourcePath(
  slug: string | null,
  state: string | null,
  city: string | null,
  fallbackId: string
): string {
  // Use SEO-friendly URL if all fields are present
  if (slug && state && city) {
    return `/resources/${state}/${city}/${slug}`
  }

  // Fall back to UUID
  return `/resources/${fallbackId}`
}

/**
 * Parse a resource slug path into components
 * @param path - URL path (e.g., "/resources/ca/oakland/resource-name")
 * @returns Parsed components or null if invalid
 */
export function parseResourcePath(path: string): {
  state: string
  city: string
  slug: string
} | null {
  const match = path.match(/^\/resources\/([a-z]{2})\/([a-z0-9-]+)\/([a-z0-9-]+)$/)

  if (!match) return null

  return {
    state: match[1],
    city: match[2],
    slug: match[3],
  }
}
