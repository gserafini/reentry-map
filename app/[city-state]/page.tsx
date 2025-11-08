import { Container, Typography, Box, Alert, Grid2 as Grid, Paper, Card, CardContent, Chip } from '@mui/material'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LocationCity as LocationIcon, Star as StarIcon, FiberNew as NewIcon } from '@mui/icons-material'
import { getResources, getCategoryCounts } from '@/lib/api/resources'
import { parseCitySlug, getCityPageData } from '@/lib/api/seo-pages'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMapWithLocation } from '@/components/map/ResourceMapWithLocation'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { SortDropdown } from '@/components/search/SortDropdown'
import { Pagination } from '@/components/search/Pagination'
import { parseSortParam } from '@/lib/utils/sort'
import { getCategoryLabel, getCategoryIcon } from '@/lib/utils/categories'
import { BreadcrumbList, CollectionPage, ItemList } from '@/components/seo/StructuredData'
import type { Metadata } from 'next'
import type { ResourceCategory } from '@/lib/types/database'

interface CityPageProps {
  params: Promise<{
    'city-state': string
  }>
  searchParams: Promise<{
    page?: string
    sort?: string
    categories?: string
  }>
}

const PAGE_SIZE = 20

/**
 * City Hub Page
 * URL: /oakland-ca, /san-francisco-ca, etc.
 * Shows all resources in a specific city with local context
 */
export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { 'city-state': cityStateSlug } = await params
  const searchParamsData = await searchParams
  const currentPage = Number(searchParamsData.page) || 1
  const offset = (currentPage - 1) * PAGE_SIZE
  const sort = parseSortParam(searchParamsData.sort)

  // Parse city and state from slug
  const parsed = parseCitySlug(cityStateSlug)
  if (!parsed) {
    notFound()
  }

  const { city, state } = parsed

  // Get city page data (validates this is a real city with enough resources)
  const cityData = await getCityPageData(city, state)
  if (!cityData) {
    notFound()
  }

  // Parse category filter from URL
  const categories = searchParamsData.categories
    ? (searchParamsData.categories.split(',').filter(Boolean) as ResourceCategory[])
    : undefined

  // Fetch resources for this city
  const { data: resources, error } = await getResources({
    city,
    state,
    categories,
    limit: PAGE_SIZE,
    offset,
    sort,
  })

  // Get category counts for this city
  const { data: categoryCounts } = await getCategoryCounts({ city, state })

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Error Loading Resources
          </Typography>
          <Typography>We encountered an issue loading resources. Please try again later.</Typography>
        </Alert>
      </Container>
    )
  }

  const totalPages = Math.ceil(cityData.totalResources / PAGE_SIZE)
  const hasResults = resources && resources.length > 0

  return (
    <>
      {/* Structured Data for SEO */}
      <BreadcrumbList
        items={[
          { name: 'Home', url: '/' },
          { name: `${city}, ${state}`, url: `/${cityStateSlug}` },
        ]}
      />
      <CollectionPage
        name={`Reentry Resources in ${city}, ${state}`}
        description={`Find ${cityData.totalResources} verified reentry resources in ${city}, ${state}.`}
        url={`/${cityStateSlug}`}
        numberOfItems={cityData.totalResources}
      />
      {resources && resources.length > 0 && (
        <ItemList
          name={`Reentry Resources in ${city}, ${state}`}
          description={`Community resources for employment, housing, food, healthcare, and more in ${city}.`}
          url={`/${cityStateSlug}`}
          resources={resources}
        />
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Hero Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <LocationIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h3" component="h1">
            Reentry Resources in {city}, {state}
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          {cityData.totalResources} verified resources to help with employment, housing, food, healthcare, and
          more
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse community resources in {city} for individuals navigating reentry. All listings are regularly
          updated and verified to ensure accuracy.
        </Typography>
      </Box>

      {/* Stats & Highlights */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* Top Rated Resource */}
        {cityData.topRatedResourceId && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <StarIcon color="warning" />
                  <Typography variant="h6">Top Rated</Typography>
                </Box>
                <Link
                  href={`/r/${cityData.topRatedResourceId}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 500, '&:hover': { color: 'primary.main' } }}>
                    {cityData.topRatedResourceName}
                  </Typography>
                </Link>
                <Typography variant="body2" color="text.secondary">
                  {cityData.topRatedResourceRating?.toFixed(1)} stars
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Newest Resource */}
        {cityData.newestResourceId && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <NewIcon color="success" />
                  <Typography variant="h6">Recently Added</Typography>
                </Box>
                <Link
                  href={`/r/${cityData.newestResourceId}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 500, '&:hover': { color: 'primary.main' } }}>
                    {cityData.newestResourceName}
                  </Typography>
                </Link>
                <Typography variant="body2" color="text.secondary">
                  Added {new Date(cityData.newestResourceDate || '').toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Browse by Category */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Browse by Category
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(cityData.categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([category, count]) => {
              const Icon = getCategoryIcon(category as ResourceCategory)
              return (
                <Link
                  key={category}
                  href={`/${cityStateSlug}/${category}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Chip
                    icon={<Icon />}
                    label={`${getCategoryLabel(category as ResourceCategory)} (${count})`}
                    clickable
                    color="primary"
                    variant="outlined"
                  />
                </Link>
              )
            })}
        </Box>
      </Box>

      {/* Resources List */}
      <Grid container spacing={3}>
        {/* Filter Sidebar */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CategoryFilter categoryCounts={categoryCounts || undefined} />
          </Card>
        </Grid>

        {/* Results */}
        <Grid size={{ xs: 12, md: 9 }}>
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

          {/* Resource List */}
          <ResourceList resources={resources || []} />

          {/* Pagination */}
          {hasResults && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={cityData.totalResources}
              pageSize={PAGE_SIZE}
            />
          )}
        </Grid>
      </Grid>
    </Container>
    </>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { 'city-state': cityStateSlug } = await params

  const parsed = parseCitySlug(cityStateSlug)
  if (!parsed) {
    return { title: 'Page Not Found | Reentry Map' }
  }

  const { city, state } = parsed
  const cityData = await getCityPageData(city, state)

  if (!cityData) {
    return { title: 'Page Not Found | Reentry Map' }
  }

  const title = `Reentry Resources in ${city}, ${state} | Reentry Map`
  const description = `Find ${cityData.totalResources} verified reentry resources in ${city}, ${state}. Browse employment, housing, food, healthcare, and support services. Updated daily.`

  return {
    title,
    description,
    keywords: [
      `${city} reentry resources`,
      `${city} employment services`,
      `${city} housing assistance`,
      `${city} ${state} reentry programs`,
      'community resources',
      'support services',
    ].join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org/${cityStateSlug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://reentrymap.org/${cityStateSlug}`,
    },
  }
}

// Generate static params for all valid city pages (ISR)
export async function generateStaticParams() {
  const { getCityPages } = await import('@/lib/api/seo-pages')
  const cityPages = await getCityPages()

  return cityPages.map((page) => ({
    'city-state': page.slug,
  }))
}
