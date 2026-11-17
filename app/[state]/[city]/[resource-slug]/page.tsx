import { Container, Typography } from '@mui/material'
import Link from 'next/link'
import { notFound, redirect, permanentRedirect } from 'next/navigation'
import { headers } from 'next/headers'
import { sql } from '@/lib/db/client'
import type { Metadata } from 'next'
import type { Resource, ResourceCategory } from '@/lib/types/database'
import { ResourceDetail } from '@/components/resources/ResourceDetail'
import {
  parseStateSlug,
  parseCitySlug,
  generateResourceSlug,
  getResourceSlug,
  generateResourceUrl,
} from '@/lib/utils/urls'
import { SmartBreadcrumbs } from '@/components/navigation/SmartBreadcrumbs'
import { ResourceViewTracker } from '@/components/analytics/ResourceViewTracker'
import { getCategoryLabel } from '@/lib/utils/categories'
import { createOpenGraphImage } from '@/lib/seo/open-graph'
import { getResourceMetadata } from '@/lib/seo/resource-metadata'
import type { Json } from '@/lib/types/database'
import { resolveDuplicateResourceRedirect } from '@/lib/server/duplicate-resource-redirect'

type ResourceWithProvenance = Resource & { provenance?: Json | null }

async function findResourceOrDuplicateRedirect(
  state: string,
  city: string,
  resourceSlug: string
): Promise<
  | { resource: Resource }
  | { redirectUrl: string }
  | { choices: Resource[] }
  | { canonicalUrl: string }
  | null
> {
  const activeResources = await sql<Resource[]>`
    SELECT * FROM resources
    WHERE LOWER(city) = LOWER(${city}) AND state = ${state} AND status = 'active'
  `
  const exact =
    activeResources?.filter(
      (resource) => getResourceSlug(resource) === resourceSlug.toLowerCase()
    ) || []
  if (exact.length === 1) return { resource: exact[0] }
  if (exact.length > 1) return { choices: exact }
  const previous =
    activeResources?.filter(
      (resource) => generateResourceSlug(resource.name) === resourceSlug.toLowerCase()
    ) || []
  if (previous.length === 1) return { canonicalUrl: generateResourceUrl(previous[0]) }
  if (previous.length > 1) return { choices: previous }

  // Explicit, source-reviewed rename aliases retain old links without guessing identity.
  const aliases =
    (activeResources as ResourceWithProvenance[] | undefined)?.filter((resource) => {
      const provenance = resource.provenance
      if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) return false
      const slugs = provenance.public_slug_aliases
      return (
        Array.isArray(slugs) &&
        slugs.some((slug) => typeof slug === 'string' && slug === resourceSlug.toLowerCase())
      )
    }) || []
  if (aliases.length === 1) return { canonicalUrl: generateResourceUrl(aliases[0]) }
  if (aliases.length > 1) return { choices: aliases }

  const inactiveResources = await sql<ResourceWithProvenance[]>`
    SELECT * FROM resources
    WHERE LOWER(city) = LOWER(${city}) AND state = ${state} AND status = 'inactive'
  `
  const duplicateMatches =
    inactiveResources?.filter(
      (resource) => generateResourceSlug(resource.name) === resourceSlug.toLowerCase()
    ) ?? []
  // Inactive records are only redirect sources when the requested slug identifies
  // exactly one source. Multiple merged records may have different canonicals.
  if (duplicateMatches.length !== 1) return null
  const duplicate = duplicateMatches[0]

  const redirectUrl = await resolveDuplicateResourceRedirect(duplicate)
  return redirectUrl ? { redirectUrl } : null
}

interface ResourcePageProps {
  params: Promise<{
    state: string
    city: string
    'resource-slug': string
  }>
}

/**
 * Resource Detail Page
 * URL: /{state}/{city}/{resource-slug}
 * Example: /ca/oakland/oakland-job-center
 *
 * Features:
 * - Hierarchical URLs with state → city → resource
 * - Smart breadcrumbs based on referrer
 * - Full SEO optimization
 * - Structured data (LocalBusiness schema)
 */
export default async function ResourcePage({ params }: ResourcePageProps) {
  const { state: stateSlug, city: citySlug, 'resource-slug': resourceSlug } = await params
  const headersList = await headers()
  const referer = headersList.get('referer') || ''

  // Parse state and city from slugs
  const state = parseStateSlug(stateSlug)
  const city = parseCitySlug(citySlug)

  // City slugs normalize capitalization; match stored city names case-insensitively.
  const match = await findResourceOrDuplicateRedirect(state, city, resourceSlug)
  if (match && 'redirectUrl' in match) redirect(match.redirectUrl)
  if (match && 'canonicalUrl' in match) permanentRedirect(match.canonicalUrl)
  if (match && 'choices' in match)
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography component="h1" variant="h4">
          Choose a service location
        </Typography>
        <Typography sx={{ my: 2 }}>
          These directory records share a name. Choose the program or location you need; contact the
          provider to confirm access.
        </Typography>
        <ul>
          {match.choices.map((resource) => (
            <li key={resource.id} style={{ marginBottom: 20 }}>
              <Link href={generateResourceUrl(resource)}>{resource.name}</Link>
              <p>
                {resource.address_type === 'regional'
                  ? `${resource.city}, ${resource.state} — service area; no public intake pin`
                  : resource.address}
              </p>
              {resource.phone ? <p>{resource.phone}</p> : null}
            </li>
          ))}
        </ul>
      </Container>
    )
  const resource = match && 'resource' in match ? match.resource : undefined
  if (!resource) notFound()

  return (
    <>
      {/* Analytics Tracking */}
      <ResourceViewTracker resourceId={resource.id} resourceName={resource.name} />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Smart Breadcrumbs - adapt based on how user got here */}
        <SmartBreadcrumbs resource={resource} referer={referer} />

        <ResourceDetail resource={resource} />
      </Container>
    </>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, 'resource-slug': resourceSlug } = await params

  // Parse state and city
  const state = parseStateSlug(stateSlug)
  const city = parseCitySlug(citySlug)

  // Find resource
  const match = await findResourceOrDuplicateRedirect(state, city, resourceSlug)
  if (match && 'redirectUrl' in match) redirect(match.redirectUrl)
  if (match && 'canonicalUrl' in match) permanentRedirect(match.canonicalUrl)
  if (match && 'choices' in match)
    return {
      title: 'Choose a service location | Reentry Map',
      description: 'Choose between directory records that share a name.',
      robots: { index: false, follow: true },
    }
  const resource = match && 'resource' in match ? match.resource : undefined

  if (!resource) {
    return {
      title: 'Resource Not Found | Reentry Map',
    }
  }

  const { title, description, location, keywords } = getResourceMetadata(resource)
  const image = createOpenGraphImage({
    kind: 'resource',
    resourceId: resource.id,
    resourceVersion: String(resource.updated_at || ''),
    eyebrow: `${getCategoryLabel(resource.primary_category as ResourceCategory)} provider`,
    title: resource.name,
    description,
    location,
    category: resource.primary_category,
  })

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org${generateResourceUrl(resource)}`,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: `https://reentrymap.org${generateResourceUrl(resource)}`,
    },
  }
}

// Generate static params for ISR (top resources only to avoid excessive builds)
// Returns [] during CI build when DATABASE_URL is unavailable
export async function generateStaticParams() {
  try {
    const topResources = await sql<
      { id: string; name: string; city: string; state: string; slug: string | null }[]
    >`
      SELECT id, name, city, state, slug FROM resources
      WHERE status = 'active' AND city IS NOT NULL AND state IS NOT NULL
      ORDER BY rating_average DESC NULLS LAST
      LIMIT 100
    `

    return topResources.map((resource) => {
      const stateSlug = resource.state.toLowerCase()
      const citySlug = resource.city.toLowerCase().replace(/\s+/g, '-')
      const resourceSlug = getResourceSlug(resource)

      return {
        state: stateSlug,
        city: citySlug,
        'resource-slug': resourceSlug,
      }
    })
  } catch {
    return []
  }
}
