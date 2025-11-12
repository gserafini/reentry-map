import { generateResourceUrl, generateShortResourceUrl } from './urls'
import type { Resource } from '@/lib/types/database'

/**
 * Generate SEO-friendly URL for a resource
 * New format: /{city-state}/{resource-slug}
 * Example: /oakland-ca/oakland-job-center
 *
 * Falls back to short URL (/r/{id}) if resource lacks location data
 */
export function getResourceUrl(resource: {
  id?: string
  name?: string
  slug?: string | null
  state?: string | null
  city?: string | null
}): string {
  // Use new SEO-friendly URL if city, state, and name are available
  if (resource.city && resource.state && resource.name) {
    return generateResourceUrl(resource as Resource)
  }

  // Fall back to short URL if no location data
  if (resource.id) {
    return generateShortResourceUrl(resource.id)
  }

  // Ultimate fallback (shouldn't happen)
  return '/resources'
}
