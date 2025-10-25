import { Container, Typography, Box, Alert, Button, Grid } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import Link from 'next/link'
import { getResources, getCategoryCounts } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import type { ResourceCategory } from '@/lib/types/database'

interface ResourcesPageProps {
  searchParams: Promise<{
    search?: string
    categories?: string
  }>
}

/**
 * Resources List Page
 * Server Component that fetches and displays all active resources
 */
export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const { search, categories: categoriesParam } = await searchParams

  // Parse categories from URL param
  const categories = categoriesParam
    ? (categoriesParam.split(',').filter(Boolean) as ResourceCategory[])
    : undefined

  // Fetch resources with filters
  const { data: resources, error } = await getResources({ search, categories, limit: 100 })

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
  const isFiltering = Boolean(categories && categories.length > 0)

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {isSearching ? <>Search Results: &ldquo;{search}&rdquo;</> : 'Community Resources'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isSearching
            ? 'Results matching your search query'
            : 'Browse resources in your area to help with employment, housing, food, and more.'}
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
              {isFiltering && ` in selected categories`}
            </Typography>
          )}

          {/* No results state */}
          {!hasResults && (isSearching || isFiltering) && (
            <Alert
              severity="info"
              icon={<SearchOffIcon />}
              sx={{ mb: 3 }}
              action={
                <Link href="/resources" style={{ textDecoration: 'none' }}>
                  <Button color="inherit" size="small">
                    Clear Filters
                  </Button>
                </Link>
              }
            >
              <Typography variant="subtitle2" gutterBottom>
                No results found
                {isSearching && ` for "${search}"`}
                {isFiltering && ` in selected categories`}
              </Typography>
              <Typography variant="body2">
                Try adjusting your filters or browse all resources.
              </Typography>
            </Alert>
          )}

          <ResourceList resources={resources || []} />
        </Grid>
      </Grid>
    </Container>
  )
}
