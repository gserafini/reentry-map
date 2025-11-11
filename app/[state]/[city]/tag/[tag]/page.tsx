import { Container, Typography, Box, Alert, Grid, Paper, Breadcrumbs } from '@mui/material'
import Link from 'next/link'
import { NavigateNext as NavigateNextIcon, LocalOffer as TagIcon } from '@mui/icons-material'
import { getResources, getResourcesCount } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMapWithLocation } from '@/components/map/ResourceMapWithLocation'
import { SortDropdown } from '@/components/search/SortDropdown'
import { Pagination } from '@/components/search/Pagination'
import { parseSortParam } from '@/lib/utils/sort'
import { BreadcrumbList, CollectionPage, ItemList } from '@/components/seo/StructuredData'
import { parseStateSlug, parseCitySlug, generateCityUrl, generateStateUrl } from '@/lib/utils/urls'
import type { Metadata } from 'next'

interface TagInCityPageProps {
  params: Promise<{
    state: string
    city: string
    tag: string
  }>
  searchParams: Promise<{
    page?: string
    sort?: string
  }>
}

const PAGE_SIZE = 20

/**
 * Tag in City Page
 * URL: /ca/oakland/tag/veterans
 * Shows resources with specific tag within a specific city
 */
export default async function TagInCityPage({ params, searchParams }: TagInCityPageProps) {
  const { state: stateSlug, city: citySlug, tag } = await params
  const searchParamsData = await searchParams
  const currentPage = Number(searchParamsData.page) || 1
  const offset = (currentPage - 1) * PAGE_SIZE
  const sort = parseSortParam(searchParamsData.sort)

  // Parse state and city from slugs
  const state = parseStateSlug(stateSlug)
  const city = parseCitySlug(citySlug)

  // Decode tag (URL encoded)
  const decodedTag = decodeURIComponent(tag)

  // Fetch resources for this tag in this city
  const { data: resources, error } = await getResources({
    city,
    state,
    tags: [decodedTag],
    limit: PAGE_SIZE,
    offset,
    sort,
  })

  // Get total count for pagination
  const { data: totalCount } = await getResourcesCount({
    city,
    state,
    tags: [decodedTag],
  })

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Error Loading Resources
          </Typography>
          <Typography>
            We encountered an issue loading resources. Please try again later.
          </Typography>
        </Alert>
      </Container>
    )
  }

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE)
  const hasResults = resources && resources.length > 0

  const cityUrl = generateCityUrl(city, state)
  const tagUrl = `/tag/${tag}`
  const tagInCityUrl = `/${stateSlug}/${citySlug}/tag/${tag}`

  // Format tag for display
  const tagLabel = decodedTag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <>
      {/* Structured Data for SEO */}
      <BreadcrumbList
        items={[
          { name: 'Home', url: '/' },
          { name: state, url: generateStateUrl(state) },
          { name: `${city}, ${state}`, url: cityUrl },
          { name: tagLabel, url: tagInCityUrl },
        ]}
      />
      <CollectionPage
        name={`${tagLabel} in ${city}, ${state}`}
        description={`Find ${totalCount || 0} ${tagLabel.toLowerCase()} resources in ${city}, ${state}.`}
        url={tagInCityUrl}
        numberOfItems={totalCount || 0}
      />
      {resources && resources.length > 0 && (
        <ItemList
          name={`${tagLabel} in ${city}, ${state}`}
          description={`${tagLabel} resources for individuals navigating reentry in ${city}.`}
          url={tagInCityUrl}
          resources={resources}
        />
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Home
          </Link>
          <Link href={generateStateUrl(state)} style={{ textDecoration: 'none', color: 'inherit' }}>
            {state}
          </Link>
          <Link href={cityUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
            {city}, {state}
          </Link>
          <Typography color="text.primary">{tagLabel}</Typography>
        </Breadcrumbs>

        {/* Hero Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TagIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h3" component="h1">
              {tagLabel} in {city}, {state}
            </Typography>
          </Box>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            {totalCount || 0} {tagLabel.toLowerCase()} resources in {city}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Find verified {tagLabel.toLowerCase()} resources in {city}, {state}. All listings are
            regularly updated and include ratings, contact information, and hours of operation.
          </Typography>
        </Box>

        {/* Resources */}
        <Grid container spacing={3}>
          <Grid size={12}>
            {/* Sort dropdown */}
            {hasResults && (
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <SortDropdown />
              </Box>
            )}

            {/* Map */}
            {hasResults && (
              <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden', borderRadius: 2 }}>
                <ResourceMapWithLocation resources={resources || []} height="500px" />
              </Paper>
            )}

            {/* No Results */}
            {!hasResults && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  No {tagLabel.toLowerCase()} resources found in {city}, {state}
                </Typography>
                <Typography variant="body2">
                  Try browsing{' '}
                  <Link href={tagUrl}>all {tagLabel.toLowerCase()} resources nationwide</Link> or{' '}
                  <Link href={cityUrl}>all resources in {city}</Link>.
                </Typography>
              </Alert>
            )}

            {/* Resource List */}
            <ResourceList resources={resources || []} />

            {/* Pagination */}
            {hasResults && totalCount && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={PAGE_SIZE}
              />
            )}
          </Grid>
        </Grid>

        {/* Browse All Link */}
        <Box sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Explore More
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Link href={tagUrl}>View all {tagLabel.toLowerCase()} resources nationwide</Link> or{' '}
            <Link href={cityUrl}>browse all resources in {city}</Link>.
          </Typography>
        </Box>
      </Container>
    </>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: TagInCityPageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, tag } = await params

  const state = parseStateSlug(stateSlug)
  const city = parseCitySlug(citySlug)
  const decodedTag = decodeURIComponent(tag)

  // Get resource count
  const { data: totalCount } = await getResourcesCount({
    city,
    state,
    tags: [decodedTag],
  })

  const tagLabel = decodedTag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const title = `${tagLabel} in ${city}, ${state} | Reentry Map`
  const description = `Find ${totalCount || 0} ${tagLabel.toLowerCase()} resources in ${city}, ${state}. Browse programs, services, and support for individuals navigating reentry.`
  const tagInCityUrl = `/${stateSlug}/${citySlug}/tag/${tag}`

  return {
    title,
    description,
    keywords: [
      `${tagLabel.toLowerCase()} ${city}`,
      `${city} ${tagLabel.toLowerCase()}`,
      `${city} reentry ${tagLabel.toLowerCase()}`,
      'reentry resources',
      'community support',
    ].join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org${tagInCityUrl}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://reentrymap.org${tagInCityUrl}`,
    },
  }
}
