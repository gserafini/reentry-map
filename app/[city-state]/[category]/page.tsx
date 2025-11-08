import { Container, Typography, Box, Alert, Grid, Paper, Card, Breadcrumbs } from '@mui/material'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material'
import { getResources, getResourcesCount } from '@/lib/api/resources'
import { parseCitySlug, getCategoryInCityPageData } from '@/lib/api/seo-pages'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMapWithLocation } from '@/components/map/ResourceMapWithLocation'
import { SortDropdown } from '@/components/search/SortDropdown'
import { Pagination } from '@/components/search/Pagination'
import { parseSortParam } from '@/lib/utils/sort'
import { getCategoryLabel } from '@/lib/utils/categories'
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/category-icons'
import { CATEGORIES } from '@/lib/utils/categories'
import { BreadcrumbList, CollectionPage, ItemList } from '@/components/seo/StructuredData'
import type { Metadata } from 'next'
import type { ResourceCategory } from '@/lib/types/database'

interface CategoryInCityPageProps {
  params: Promise<{
    'city-state': string
    category: string
  }>
  searchParams: Promise<{
    page?: string
    sort?: string
  }>
}

const PAGE_SIZE = 20

/**
 * Category in City Page
 * URL: /oakland-ca/employment, /san-francisco-ca/housing, etc.
 * Shows resources in a specific category within a specific city
 */
export default async function CategoryInCityPage({
  params,
  searchParams,
}: CategoryInCityPageProps) {
  const { 'city-state': cityStateSlug, category } = await params
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

  // Validate category
  if (!CATEGORIES.find((c) => c.value === category)) {
    notFound()
  }

  // Get page data (validates this combo exists with enough resources)
  const pageData = await getCategoryInCityPageData(city, state, category as ResourceCategory)
  if (!pageData) {
    notFound()
  }

  // Fetch resources for this category in this city
  const { data: resources, error } = await getResources({
    city,
    state,
    categories: [category as ResourceCategory],
    limit: PAGE_SIZE,
    offset,
    sort,
  })

  // Get total count for pagination
  const { data: totalCount } = await getResourcesCount({
    city,
    state,
    categories: [category as ResourceCategory],
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

  const categoryLabel = getCategoryLabel(category as ResourceCategory)
  const CategoryIcon = getCategoryIcon(category as ResourceCategory)
  const categoryColor = getCategoryColor(category as ResourceCategory)

  return (
    <>
      {/* Structured Data for SEO */}
      <BreadcrumbList
        items={[
          { name: 'Home', url: '/' },
          { name: `${city}, ${state}`, url: `/${cityStateSlug}` },
          { name: categoryLabel, url: `/${cityStateSlug}/${category}` },
        ]}
      />
      <CollectionPage
        name={`${categoryLabel} in ${city}, ${state}`}
        description={`Find ${pageData.resourceCount} verified ${categoryLabel.toLowerCase()} resources in ${city}, ${state}.`}
        url={`/${cityStateSlug}/${category}`}
        numberOfItems={pageData.resourceCount}
      />
      {resources && resources.length > 0 && (
        <ItemList
          name={`${categoryLabel} in ${city}, ${state}`}
          description={`${categoryLabel} resources for individuals navigating reentry in ${city}.`}
          url={`/${cityStateSlug}/${category}`}
          resources={resources}
        />
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Home
          </Link>
          <Link href={`/${cityStateSlug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            {city}, {state}
          </Link>
          <Typography color="text.primary">{categoryLabel}</Typography>
        </Breadcrumbs>

        {/* Hero Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CategoryIcon sx={{ fontSize: 48, color: categoryColor }} />
            <Typography variant="h3" component="h1">
              {categoryLabel} in {city}, {state}
            </Typography>
          </Box>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            {pageData.resourceCount} verified {categoryLabel.toLowerCase()} resources in {city}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Find verified {categoryLabel.toLowerCase()} resources in {city}, {state}. All listings
            are regularly updated and include ratings, contact information, and hours of operation.
          </Typography>
        </Box>

        {/* Top Rated Resource Highlight */}
        {pageData.topRatedResourceId && (
          <Card
            sx={{ mb: 4, bgcolor: 'success.light', borderLeft: 4, borderColor: 'success.main' }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="success.dark" gutterBottom>
                ⭐ Top Rated in this Category
              </Typography>
              <Link
                href={`/r/${pageData.topRatedResourceId}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Typography variant="h6" sx={{ '&:hover': { color: 'primary.main' } }}>
                  {pageData.topRatedResourceName}
                </Typography>
              </Link>
              <Typography variant="body2" color="text.secondary">
                {pageData.topRatedResourceRating?.toFixed(1)} stars
              </Typography>
            </Box>
          </Card>
        )}

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
                  No {categoryLabel.toLowerCase()} resources found in {city}, {state}
                </Typography>
                <Typography variant="body2">
                  We&apos;re constantly adding new resources. Try{' '}
                  <Link href={`/${cityStateSlug}`}>browsing all categories</Link> or check back
                  soon.
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

        {/* Related Categories */}
        <Box sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Explore More Resources in {city}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <Link href={`/${cityStateSlug}`}>View all categories</Link> or browse related resources:
          </Typography>
          {/* TODO: Add related category suggestions based on common co-browsing patterns */}
        </Box>
      </Container>
    </>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryInCityPageProps): Promise<Metadata> {
  const { 'city-state': cityStateSlug, category } = await params

  const parsed = parseCitySlug(cityStateSlug)
  if (!parsed) {
    return { title: 'Page Not Found | Reentry Map' }
  }

  const { city, state } = parsed

  if (!CATEGORIES.find((c) => c.value === category)) {
    return { title: 'Page Not Found | Reentry Map' }
  }

  const pageData = await getCategoryInCityPageData(city, state, category as ResourceCategory)
  if (!pageData) {
    return { title: 'Page Not Found | Reentry Map' }
  }

  const categoryLabel = getCategoryLabel(category as ResourceCategory)
  const title = `${categoryLabel} in ${city}, ${state} | Reentry Map`
  const description = `Find ${pageData.resourceCount} verified ${categoryLabel.toLowerCase()} resources in ${city}, ${state}. Browse programs, services, and support for individuals navigating reentry. Updated daily.`

  return {
    title,
    description,
    keywords: [
      `${city} ${categoryLabel.toLowerCase()}`,
      `${categoryLabel.toLowerCase()} ${city} ${state}`,
      `${city} reentry ${categoryLabel.toLowerCase()}`,
      'reentry resources',
      'community support',
    ].join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org/${cityStateSlug}/${category}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://reentrymap.org/${cityStateSlug}/${category}`,
    },
  }
}

// Generate static params for all valid category/city combinations (ISR)
export async function generateStaticParams() {
  const { getCategoryInCityPages } = await import('@/lib/api/seo-pages')
  const pages = await getCategoryInCityPages()

  return pages.map((page) => {
    const cityStateSlug = `${page.city.toLowerCase().replace(/\s+/g, '-')}-${page.state.toLowerCase()}`
    return {
      'city-state': cityStateSlug,
      category: page.category,
    }
  })
}
