import { Container } from '@mui/material'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { ResourceDetail } from '@/components/resources/ResourceDetail'
import { parseStateSlug, parseCitySlug, generateResourceSlug } from '@/lib/utils/urls'
import { LocalBusiness } from '@/components/seo/StructuredData'
import { SmartBreadcrumbs } from '@/components/navigation/SmartBreadcrumbs'

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
  const supabase = await createClient()
  const headersList = await headers()
  const referer = headersList.get('referer') || ''

  // Parse state and city from slugs
  const state = parseStateSlug(stateSlug)
  const city = parseCitySlug(citySlug)

  // Find resource by city, state, and name slug
  const { data: cityResources, error } = await supabase
    .from('resources')
    .select('*')
    .eq('city', city)
    .eq('state', state)
    .eq('status', 'active')

  if (error || !cityResources || cityResources.length === 0) {
    notFound()
  }

  // Find the resource that matches the slug
  const resource = cityResources.find(
    (r) => generateResourceSlug(r.name) === resourceSlug.toLowerCase()
  )

  if (!resource) {
    notFound()
  }

  return (
    <>
      {/* Structured Data for SEO */}
      <LocalBusiness resource={resource} />

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
  const supabase = await createClient()

  // Parse state and city
  const state = parseStateSlug(stateSlug)
  const city = parseCitySlug(citySlug)

  // Find resource
  const { data: cityResources } = await supabase
    .from('resources')
    .select('*')
    .eq('city', city)
    .eq('state', state)
    .eq('status', 'active')

  const resource = cityResources?.find(
    (r) => generateResourceSlug(r.name) === resourceSlug.toLowerCase()
  )

  if (!resource) {
    return {
      title: 'Resource Not Found | Reentry Map',
    }
  }

  const title = `${resource.name} in ${city}, ${state} | Reentry Map`
  const description =
    resource.description?.slice(0, 160) ||
    `Find contact information, hours, and reviews for ${resource.name} in ${city}, ${state}.`

  return {
    title,
    description,
    keywords: [
      resource.name,
      `${resource.name} ${city}`,
      `${city} ${state}`,
      resource.primary_category,
      'reentry resources',
    ].join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org/${stateSlug}/${citySlug}/${resourceSlug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://reentrymap.org/${stateSlug}/${citySlug}/${resourceSlug}`,
    },
  }
}

// Generate static params for ISR (top resources only to avoid excessive builds)
export async function generateStaticParams() {
  const { createStaticClient } = await import('@/lib/supabase/server')
  const supabase = createStaticClient()

  // Generate params for top 100 most viewed/rated resources
  const { data: topResources } = await supabase
    .from('resources')
    .select('name, city, state')
    .eq('status', 'active')
    .not('city', 'is', null)
    .not('state', 'is', null)
    .order('rating_average', { ascending: false })
    .limit(100)

  if (!topResources) return []

  return topResources.map((resource) => {
    const stateSlug = resource.state.toLowerCase()
    const citySlug = resource.city.toLowerCase().replace(/\s+/g, '-')
    const resourceSlug = generateResourceSlug(resource.name)

    return {
      state: stateSlug,
      city: citySlug,
      'resource-slug': resourceSlug,
    }
  })
}
