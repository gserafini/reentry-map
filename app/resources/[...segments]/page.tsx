import { Container } from '@mui/material'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db/client'
import type { Metadata } from 'next'
import type { Resource } from '@/lib/types/database'
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
 * - 3 segments: /resources/{state}/{city}/{slug} → Single resource by SEO
 *
 * Note: Category listings now have dedicated route at /resources/category/[category]
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

  let resource

  // Determine URL format based on number of segments
  if (segments.length === 1) {
    // UUID format: /resources/{id}
    const [id] = segments
    const rows = await sql<Resource[]>`
      SELECT * FROM resources WHERE id = ${id} AND status = 'active' LIMIT 1
    `
    resource = rows[0]
    if (!resource) {
      notFound()
    }
  } else if (segments.length === 3) {
    // SEO format: /resources/{state}/{city}/{slug}
    const [state, city, slug] = segments
    const rows = await sql<Resource[]>`
      SELECT * FROM resources
      WHERE slug = ${slug} AND state = ${state} AND city = ${city} AND status = 'active'
      LIMIT 1
    `
    resource = rows[0]
    if (!resource) {
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

  let resourceName = 'Resource'

  // Fetch resource name based on URL format
  if (segments.length === 1) {
    const [id] = segments
    const rows = await sql<{ name: string; primary_category: string }[]>`
      SELECT name, primary_category FROM resources
      WHERE id = ${id} AND status = 'active' LIMIT 1
    `
    resourceName = rows[0]?.name || 'Resource'
  } else if (segments.length === 3) {
    const [state, city, slug] = segments
    const rows = await sql<{ name: string; primary_category: string }[]>`
      SELECT name, primary_category FROM resources
      WHERE slug = ${slug} AND state = ${state} AND city = ${city} AND status = 'active'
      LIMIT 1
    `
    resourceName =
      rows[0]?.name ||
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
