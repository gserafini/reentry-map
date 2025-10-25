import { Container } from '@mui/material'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { ResourceDetail } from '@/components/resources/ResourceDetail'

interface ResourceDetailPageProps {
  params: Promise<{
    segments: string[]
  }>
}

/**
 * Resource catch-all route with extensible URL format support
 *
 * Current formats:
 * - 1 segment:  /resources/{uuid} → Single resource by ID
 * - 2 segments: /resources/category/{category} → Category listings (redirects to /resources?category={category})
 * - 3 segments: /resources/{state}/{city}/{slug} → Single resource by SEO
 *
 * Future extensibility (easy to add):
 * - 2 segments: /resources/{state}/{city} → City resource listings
 * - 4 segments: /resources/{state}/{city}/{category}/{slug} → Category-specific resource
 *
 * The catch-all [...segments] pattern makes adding new URL formats trivial
 * by adding new segment length conditions below.
 */
export default async function ResourceDetailPage({ params }: ResourceDetailPageProps) {
  const { segments } = await params
  const supabase = await createClient()

  let resource

  // Determine URL format based on number of segments
  if (segments.length === 1) {
    // UUID format: /resources/{id}
    const [id] = segments
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    resource = data
    if (error) {
      notFound()
    }
  } else if (segments.length === 2 && segments[0] === 'category') {
    // Category listing format: /resources/category/{category}
    // This should redirect to the main resources page with category filter
    const [, category] = segments
    const { redirect } = await import('next/navigation')
    redirect(`/resources?category=${category}`)
  } else if (segments.length === 3) {
    // SEO format: /resources/{state}/{city}/{slug}
    const [state, city, slug] = segments
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('slug', slug)
      .eq('state', state)
      .eq('city', city)
      .eq('status', 'active')
      .single()

    resource = data
    if (error) {
      notFound()
    }
  } else {
    // Invalid URL format
    notFound()
  }

  if (!resource) {
    notFound()
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <ResourceDetail resource={resource} />
    </Container>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ResourceDetailPageProps): Promise<Metadata> {
  const { segments } = await params
  const supabase = await createClient()

  let resourceName = 'Resource'

  // Fetch resource name based on URL format
  if (segments.length === 1) {
    const [id] = segments
    const { data } = await supabase
      .from('resources')
      .select('name, primary_category')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    resourceName = data?.name || 'Resource'
  } else if (segments.length === 3) {
    const [state, city, slug] = segments
    const { data } = await supabase
      .from('resources')
      .select('name, primary_category')
      .eq('slug', slug)
      .eq('state', state)
      .eq('city', city)
      .eq('status', 'active')
      .single()

    resourceName =
      data?.name ||
      slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
  }

  return {
    title: `${resourceName} | Reentry Map`,
    description: `Information about ${resourceName} and how to access their services.`,
  }
}
