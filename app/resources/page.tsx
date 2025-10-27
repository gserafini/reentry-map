import { Container, Typography, Box, Alert } from '@mui/material'
import { getResources, getCategoryCounts } from '@/lib/api/resources'
import { ResourcesView } from './ResourcesView'
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

  // Server-side logging
  console.log('[ResourcesPage] Fetched resources:', {
    count: resources?.length || 0,
    hasError: !!error,
    error: error?.message,
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

      <ResourcesView
        resources={resources || []}
        categoryCounts={categoryCounts || undefined}
        search={search}
        isSearching={isSearching}
        isFiltering={isFiltering}
      />
    </Container>
  )
}
