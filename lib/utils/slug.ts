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
 * Extract county from address or resource name
 * @param address - Address string
 * @param name - Resource name
 * @returns County name as slug, or null if not found
 * @example
 * extractCountyFromAddress("123 Main St, Oakland, CA", "Alameda County Services") → "alameda"
 */
export function extractCountyFromAddress(
  address: string | null,
  name: string | null
): string | null {
  // Try to find "County" in the resource name first
  if (name) {
    const countyMatch = name.match(/([A-Za-z\s]+)\s+County/i)
    if (countyMatch) {
      return generateSlug(countyMatch[1])
    }
  }

  // Try to extract city/county from address (between commas)
  if (address) {
    const parts = address.split(',').map((p) => p.trim())
    if (parts.length >= 2) {
      // Second part is usually city/county
      return generateSlug(parts[1])
    }
  }

  return null
}

/**
 * Generate full SEO-friendly URL path for a resource
 * @param name - Resource name
 * @param address - Resource address
 * @param fallbackId - UUID to use if slug generation fails
 * @returns URL path in format: /resources/[state]/[county]/[slug]
 * @example
 * generateResourcePath("Alameda County Health", "123 Main, Oakland, CA")
 * → "/resources/ca/alameda/alameda-county-health"
 */
export function generateResourcePath(
  name: string,
  address: string | null,
  fallbackId?: string
): string {
  const state = extractStateFromAddress(address)
  const county = extractCountyFromAddress(address, name)
  const slug = generateSlug(name)

  // If we can't generate proper location info, fall back to UUID
  if (!state || !county) {
    return fallbackId ? `/resources/${fallbackId}` : `/resources/${slug}`
  }

  return `/resources/${state}/${county}/${slug}`
}

/**
 * Parse a resource slug path into components
 * @param path - URL path (e.g., "/resources/ca/alameda/resource-name")
 * @returns Parsed components or null if invalid
 */
export function parseResourcePath(path: string): {
  state: string
  county: string
  slug: string
} | null {
  const match = path.match(/^\/resources\/([a-z]{2})\/([a-z0-9-]+)\/([a-z0-9-]+)$/)

  if (!match) return null

  return {
    state: match[1],
    county: match[2],
    slug: match[3],
  }
}
