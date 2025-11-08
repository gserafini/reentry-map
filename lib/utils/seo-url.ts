/**
 * SEO URL Generation Utilities
 * Generates clean, SEO-friendly URLs for resources
 */

import type { Resource } from '@/lib/types/database'

/**
 * Generate SEO-friendly URL for a resource
 * Pattern: /resources/[name-slug]/[id]
 * Example: /resources/oakland-job-center/abc123
 */
export function generateSeoUrl(resource: Resource): string {
  // Generate slug from resource name
  const nameSlug = resource.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .slice(0, 60) // Limit length

  return `/resources/${nameSlug}/${resource.id}`
}

/**
 * Parse SEO-friendly resource URL
 * Extracts ID from URL pattern /resources/[slug]/[id]
 */
export function parseResourceUrl(url: string): string | null {
  const parts = url.split('/')
  // URL format: /resources/[slug]/[id]
  if (parts.length >= 4 && parts[1] === 'resources') {
    return parts[3] // Return the ID
  }
  return null
}
