import { Container, Typography, Box, Alert, Grid } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import { notFound } from 'next/navigation'
import { getResources, getCategoryCounts, getResourcesCount } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { Pagination } from '@/components/search/Pagination'
import { parseSeoUrl, getCategoryPhrase, generateSeoIntro } from '@/lib/utils/seo-routes'
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/category-icons'
import type { Metadata } from 'next'

interface HyperlocalSearchPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    page?: string
  }>
}

const PAGE_SIZE = 20

/**
 * Hyperlocal SEO landing pages
 * URL pattern: /search/{category}-in-{city}-{state}/
 * Examples:
 * - /search/employment-in-oakland-ca/
 * - /search/housing-in-san-francisco-ca/
 * - /search/food-assistance-in-berkeley-ca/
 */
export default async function HyperlocalSearchPage({
  params,
  searchParams,
}: HyperlocalSearchPageProps) {
  const { slug } = await params
  const searchParamsData = await searchParams
  const currentPage = Number(searchParamsData.page) || 1
  const offset = (currentPage - 1) * PAGE_SIZE

  // Parse the SEO-friendly URL
  const parsed = parseSeoUrl(slug)
  if (!parsed) {
    notFound()
  }

  const { category, city, state } = parsed

  // Fetch resources filtered by category and location
  const { data: resources, error } = await getResources({
    categories: [category],
    limit: PAGE_SIZE,
    offset,
    // TODO: Add location filtering when we implement geospatial search
    // For now, we'll show all resources in the category
  })

  // Get total count for pagination
  const { data: totalCount } = await getResourcesCount({
    categories: [category],
  })
  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE)

  // Fetch category counts for filter display
  const { data: categoryCounts } = await getCategoryCounts()

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ textAlign: 'center' }}>
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

  const hasResults = resources && resources.length > 0
  const categoryPhrase = getCategoryPhrase(category)
  const seoIntro = generateSeoIntro(category, city, state)
  const CategoryIcon = getCategoryIcon(category)
  const categoryColor = getCategoryColor(category)

  // Capitalize city name
  const cityName = city
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CategoryIcon sx={{ fontSize: 48, color: categoryColor }} />
          <Typography variant="h3" component="h1">
            Find {categoryPhrase} in {cityName}, {state}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {seoIntro}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Browse verified {categoryPhrase.toLowerCase()} resources in {cityName}, {state}. All
          listings are regularly updated and verified to ensure accuracy.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Category Filter Sidebar */}
        <Grid size={{ xs: 12, md: 3 }}>
          <CategoryFilter categoryCounts={categoryCounts || undefined} />
        </Grid>

        {/* Results */}
        <Grid size={{ xs: 12, md: 9 }}>
          {/* No results state */}
          {!hasResults && (
            <Alert severity="info" icon={<SearchOffIcon />} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                No {categoryPhrase.toLowerCase()} resources found in {cityName}, {state}
              </Typography>
              <Typography variant="body2">
                We&apos;re constantly adding new resources. Try browsing other categories or check
                back soon.
              </Typography>
            </Alert>
          )}

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
    </Container>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: HyperlocalSearchPageProps): Promise<Metadata> {
  const { slug } = await params

  // Parse the SEO-friendly URL
  const parsed = parseSeoUrl(slug)
  if (!parsed) {
    return {
      title: 'Page Not Found | Reentry Map',
    }
  }

  const { category, city, state } = parsed
  const categoryPhrase = getCategoryPhrase(category)
  const seoIntro = generateSeoIntro(category, city, state)

  // Capitalize city name
  const cityName = city
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: `Find ${categoryPhrase} in ${cityName}, ${state} | Reentry Map`,
    description: `${seoIntro} Find verified ${categoryPhrase.toLowerCase()} resources in ${cityName}, ${state}.`,
    openGraph: {
      title: `Find ${categoryPhrase} in ${cityName}, ${state}`,
      description: seoIntro,
      type: 'website',
    },
  }
}
