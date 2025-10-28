import { Container, Typography, Box, Alert, Button, Grid, Paper } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getResources, getCategoryCounts, getResourcesCount } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMap } from '@/components/map/ResourceMap'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { Pagination } from '@/components/search/Pagination'
import { SortDropdown } from '@/components/search/SortDropdown'
import { parseSortParam } from '@/lib/utils/sort'
import { getCategoryLabel, getAllCategories } from '@/lib/utils/categories'
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/category-icons'
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
 * Category-specific Resources Page
 * SEO-friendly route: /resources/category/{category}
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

  // Fetch resources for this category
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CategoryIcon sx={{ fontSize: 48, color: categoryColor }} />
          <Typography variant="h3" component="h1">
            {categoryLabel} Resources{isSearching && <> - &ldquo;{search}&rdquo;</>}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {isSearching
            ? `Search results in ${categoryLabel.toLowerCase()}`
            : `Browse all ${categoryLabel.toLowerCase()} resources in your area`}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Category Filter Sidebar */}
        <Grid size={{ xs: 12, md: 3 }}>
          <CategoryFilter categoryCounts={categoryCounts || undefined} />
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
                <Link href={`/resources/category/${category}`} style={{ textDecoration: 'none' }}>
                  <Button color="inherit" size="small">
                    Clear Search
                  </Button>
                </Link>
              }
            >
              <Typography variant="subtitle2" gutterBottom>
                No results found{isSearching && ` for "${search}"`}
              </Typography>
              <Typography variant="body2">
                {isSearching
                  ? 'Try adjusting your search terms.'
                  : `There are currently no ${categoryLabel.toLowerCase()} resources available.`}
              </Typography>
            </Alert>
          )}

          {/* Map */}
          {hasResults && (
            <Paper
              elevation={2}
              sx={{
                mb: 3,
                overflow: 'hidden',
                borderRadius: 2,
              }}
            >
              <ResourceMap resources={resources || []} height="500px" />
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
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryPageProps) {
  const { category } = await params

  // Validate category
  const validCategories = getAllCategories()
  if (!validCategories.includes(category as ResourceCategory)) {
    return {
      title: 'Category Not Found | Reentry Map',
    }
  }

  const categoryLabel = getCategoryLabel(category as ResourceCategory)

  return {
    title: `${categoryLabel} Resources | Reentry Map`,
    description: `Find ${categoryLabel.toLowerCase()} resources in your community. Browse employment, housing, food assistance, and more.`,
  }
}
