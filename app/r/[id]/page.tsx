import { redirect } from 'next/navigation'
import { getResourceById } from '@/lib/api/resources'
import { generateResourceUrl } from '@/lib/utils/urls'
import { resolveDuplicateResourceRedirect } from '@/lib/server/duplicate-resource-redirect'
import type { Json, Resource } from '@/lib/types/database'

type ResourceWithProvenance = Resource & { provenance?: Json | null }

interface ShortResourcePageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Short Resource URL
 * URL: /r/{id}
 * Example: /r/abc123
 *
 * Redirects to full SEO-friendly resource URL: /{city-state}/{resource-slug}
 * Provides short, shareable URLs perfect for:
 * - QR codes
 * - SMS/text messages
 * - Social media
 * - Backward compatibility
 */
export default async function ShortResourcePage({ params }: ShortResourcePageProps) {
  const { id } = await params

  // Fetch resource to get full details
  const { data: resource } = await getResourceById(id)

  if (!resource) {
    redirect('/')
  }

  if (resource.status !== 'active') {
    const duplicate = resource as ResourceWithProvenance
    const canonicalUrl = await resolveDuplicateResourceRedirect(duplicate)
    if (!canonicalUrl) redirect('/')
    redirect(canonicalUrl)
  }

  // Generate the canonical SEO-friendly URL and redirect (307 by default).
  const seoUrl = generateResourceUrl(resource)
  redirect(seoUrl)
}
