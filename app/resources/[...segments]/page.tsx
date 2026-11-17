import { Container } from '@mui/material'
import { notFound, permanentRedirect } from 'next/navigation'
import { sql } from '@/lib/db/client'
import type { Metadata } from 'next'
import type { Resource, ResourceCategory } from '@/lib/types/database'
import { ResourceDetail } from '@/components/resources/ResourceDetail'
import { getCategoryLabel } from '@/lib/utils/categories'
import { createOpenGraphImage } from '@/lib/seo/open-graph'
import { getResourceMetadata } from '@/lib/seo/resource-metadata'
import { generateResourceUrl } from '@/lib/utils/urls'

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
  if (segments.length === 3 && /^[a-z]{2}$/i.test(segments[0]))
    permanentRedirect('/' + segments.map(encodeURIComponent).join('/'))

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
  if (segments.length === 3 && /^[a-z]{2}$/i.test(segments[0]))
    permanentRedirect('/' + segments.map(encodeURIComponent).join('/'))

  let resource:
    | Pick<
        Resource,
        | 'id'
        | 'slug'
        | 'updated_at'
        | 'name'
        | 'primary_category'
        | 'city'
        | 'state'
        | 'description'
        | 'address_type'
        | 'service_area'
      >
    | undefined
  let fallbackName = 'Resource'

  if (segments.length === 1) {
    const [id] = segments
    const rows = await sql<
      Pick<
        Resource,
        | 'id'
        | 'slug'
        | 'updated_at'
        | 'name'
        | 'primary_category'
        | 'city'
        | 'state'
        | 'description'
        | 'address_type'
        | 'service_area'
      >[]
    >`
      SELECT id, slug, updated_at, name, primary_category, city, state, description, address_type, service_area FROM resources
      WHERE id = ${id} AND status = 'active' LIMIT 1
    `
    resource = rows[0]
  } else if (segments.length === 3) {
    const [state, city, slug] = segments
    const rows = await sql<
      Pick<
        Resource,
        | 'id'
        | 'slug'
        | 'updated_at'
        | 'name'
        | 'primary_category'
        | 'city'
        | 'state'
        | 'description'
        | 'address_type'
        | 'service_area'
      >[]
    >`
      SELECT id, slug, updated_at, name, primary_category, city, state, description, address_type, service_area FROM resources
      WHERE slug = ${slug} AND state = ${state} AND city = ${city} AND status = 'active'
      LIMIT 1
    `
    resource = rows[0]
    fallbackName = slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const resourceName = resource?.name || fallbackName
  const { title, description, location } = getResourceMetadata(
    resource || {
      name: fallbackName,
      city: '',
      state: '',
      description: null,
      primary_category: 'general-support',
    }
  )
  const image = createOpenGraphImage({
    kind: 'resource',
    resourceId: resource?.id,
    resourceVersion: String(resource?.updated_at || ''),
    eyebrow: resource?.primary_category
      ? `${getCategoryLabel(resource.primary_category as ResourceCategory)} provider`
      : 'Community resource',
    title: resourceName,
    description,
    location,
    category: resource?.primary_category,
  })

  return {
    title,
    description,
    alternates: resource
      ? { canonical: `https://reentrymap.org${generateResourceUrl(resource)}` }
      : undefined,
    openGraph: {
      url: resource ? generateResourceUrl(resource) : '/resources',
      title,
      description,
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}
