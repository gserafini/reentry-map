import { Container, Typography, Box, Alert, Button, Grid, Paper, Card } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getResources, getCategoryCounts, getResourcesCount } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMapWithLocation } from '@/components/map/ResourceMapWithLocation'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { LocationFilterSidebar } from '@/components/search/LocationFilterSidebar'
import { Pagination } from '@/components/search/Pagination'
import { SortDropdown } from '@/components/search/SortDropdown'
import { parseSortParam } from '@/lib/utils/sort'
import { getCategoryLabel, getAllCategories } from '@/lib/utils/categories'
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/category-icons'
import { BreadcrumbList, CollectionPage, ItemList } from '@/components/seo/StructuredData'
import type { ResourceCategory } from '@/lib/types/database'

interface CategoryPageProps {
  params: Promise<{
    category: string
  }>
  searchParams: Promise<{
    search?: string
    page?: string
    sort?: string
  }>
}

const PAGE_SIZE = 20

/**
 * National Category Page
 * URL: /category/{category}
 * Shows ALL resources nationwide in this category
 */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params
  const { search, page, sort: sortParam } = await searchParams
  const currentPage = Number(page) || 1
  const offset = (currentPage - 1) * PAGE_SIZE
  const sort = parseSortParam(sortParam)

  // Validate category
  const validCategories = getAllCategories()
  if (!validCategories.includes(category as ResourceCategory)) {
    notFound()
  }

  const typedCategory = category as ResourceCategory

  // Fetch resources for this category (nationwide)
  const { data: resources, error } = await getResources({
    search,
    categories: [typedCategory],
    limit: PAGE_SIZE,
    offset,
    sort,
  })

  // Get total count for pagination
  const { data: totalCount } = await getResourcesCount({
    search,
    categories: [typedCategory],
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
  const isSearching = Boolean(search && search.trim())
  const categoryLabel = getCategoryLabel(typedCategory)
  const CategoryIcon = getCategoryIcon(typedCategory)
  const categoryColor = getCategoryColor(typedCategory)

  return (
    <>
      {/* Structured Data for SEO */}
      <BreadcrumbList
        items={[
          { name: 'Home', url: '/' },
          { name: categoryLabel, url: `/category/${category}` },
        ]}
      />
      <CollectionPage
        name={`${categoryLabel} Reentry Resources`}
        description={`Browse ${totalCount || 0} ${categoryLabel.toLowerCase()} resources nationwide.`}
        url={`/category/${category}`}
        numberOfItems={totalCount || 0}
      />
      {resources && resources.length > 0 && (
        <ItemList
          name={`${categoryLabel} Resources`}
          description={`${categoryLabel} resources for individuals navigating reentry across the United States.`}
          url={`/category/${category}`}
          resources={resources}
        />
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CategoryIcon sx={{ fontSize: 48, color: categoryColor }} />
            <Typography variant="h3" component="h1">
              {categoryLabel} Resources{isSearching && <> - &ldquo;{search}&rdquo;</>}
            </Typography>
          </Box>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {totalCount || 0} resources nationwide
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isSearching
              ? `Search results in ${categoryLabel.toLowerCase()}`
              : `Browse all ${categoryLabel.toLowerCase()} resources across the United States. Use the location filter to find resources near you.`}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Filter Sidebar - Location + Categories */}
          <Grid size={{ xs: 12, md: 3 }}>
            <LocationFilterSidebar>
              <Card>
                <CategoryFilter categoryCounts={categoryCounts || undefined} />
              </Card>
            </LocationFilterSidebar>
          </Grid>

          {/* Results */}
          <Grid size={{ xs: 12, md: 9 }}>
            {/* Sort dropdown */}
            {hasResults && (
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <SortDropdown />
              </Box>
            )}

            {/* No results state */}
            {!hasResults && (
              <Alert
                severity="info"
                icon={<SearchOffIcon />}
                sx={{ mb: 3 }}
                action={
                  isSearching ? (
                    <Link href={`/category/${category}`} style={{ textDecoration: 'none' }}>
                      <Button color="inherit" size="small">
                        Clear Search
                      </Button>
                    </Link>
                  ) : undefined
                }
              >
                <Typography variant="subtitle2" gutterBottom>
                  No results found{isSearching && ` for "${search}"`}
                </Typography>
                <Typography variant="body2">
                  {isSearching
                    ? 'Try adjusting your search terms or location filters.'
                    : `There are currently no ${categoryLabel.toLowerCase()} resources available.`}
                </Typography>
              </Alert>
            )}

            {/* Map with location-based zoom */}
            {hasResults && (
              <Paper
                elevation={2}
                sx={{
                  mb: 3,
                  overflow: 'hidden',
                  borderRadius: 2,
                }}
              >
                <ResourceMapWithLocation resources={resources || []} height="500px" />
              </Paper>
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
    </>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params

  const validCategories = getAllCategories()
  if (!validCategories.includes(category as ResourceCategory)) {
    return { title: 'Category Not Found | Reentry Map' }
  }

  const categoryLabel = getCategoryLabel(category as ResourceCategory)
  const title = `${categoryLabel} Reentry Resources | Nationwide Directory`
  const description = `Browse ${categoryLabel.toLowerCase()} resources for individuals navigating reentry across the United States. Find employment, housing, healthcare, and support services nationwide.`

  return {
    title,
    description,
    keywords: [
      `${categoryLabel.toLowerCase()} reentry resources`,
      `reentry ${categoryLabel.toLowerCase()}`,
      `${categoryLabel.toLowerCase()} programs`,
      'nationwide reentry support',
      'reentry services directory',
    ].join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org/category/${category}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://reentrymap.org/category/${category}`,
    },
  }
}

// Generate static params for all categories (ISR)
export async function generateStaticParams() {
  const categories = getAllCategories()

  return categories.map((category) => ({
    category,
  }))
}
