import { Container, Typography, Box, Alert, Button, Grid } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getResources, getCategoryCounts } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { getCategoryLabel, getAllCategories } from '@/lib/utils/categories'
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/category-icons'
import type { ResourceCategory } from '@/lib/types/database'

interface CategoryPageProps {
  params: Promise<{
    category: string
  }>
  searchParams: Promise<{
    search?: string
  }>
}

/**
 * Category-specific Resources Page
 * SEO-friendly route: /resources/category/{category}
 */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params
  const { search } = await searchParams

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
    limit: 100,
  })

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
          {/* Results count */}
          {hasResults && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {resources.length} resource{resources.length !== 1 ? 's' : ''}
            </Typography>
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

          <ResourceList resources={resources || []} />
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
