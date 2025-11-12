import { redirect } from 'next/navigation'
import { getResourceById } from '@/lib/api/resources'
import { generateResourceUrl } from '@/lib/utils/urls'

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

  // Generate new SEO-friendly URL and redirect (permanent 308)
  const seoUrl = generateResourceUrl(resource)
  redirect(seoUrl)
}
