import { redirect } from 'next/navigation'
import { getResourceById } from '@/lib/api/resources'
import { generateSeoUrl } from '@/lib/utils/seo-url'

interface ShortResourcePageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Short Resource URL
 * URL: /r/[id]
 * Redirects to the full SEO-friendly resource URL
 * This provides a short, shareable URL for resources
 */
export default async function ShortResourcePage({ params }: ShortResourcePageProps) {
  const { id } = await params

  // Fetch resource to get full details
  const { data: resource } = await getResourceById(id)

  if (!resource) {
    redirect('/')
  }

  // Generate SEO-friendly URL and redirect
  const seoUrl = generateSeoUrl(resource)
  redirect(seoUrl)
}
