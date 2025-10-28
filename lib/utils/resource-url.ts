/**
 * Generate SEO-friendly URL for a resource
 * Returns /resources/{state}/{city}/{slug} if available, otherwise /resources/{id}
 */
export function getResourceUrl(resource: {
  id?: string
  slug?: string | null
  state?: string | null
  city?: string | null
}): string {
  // Use SEO-friendly URL if slug, state, and city are available
  if (resource.slug && resource.state && resource.city) {
    return `/resources/${resource.state}/${resource.city}/${resource.slug}`
  }

  // Fall back to UUID-based URL
  return `/resources/${resource.id}`
}
