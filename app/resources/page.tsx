import { Container, Typography, Box, Alert } from '@mui/material'
import { getResources, getCategoryCounts, getResourcesForMap } from '@/lib/api/resources'
import { ResourcesView } from './ResourcesView'
import { buildResourcesQueryOptions } from './params'

interface ResourcesPageProps {
  searchParams: Promise<{
    search?: string
    categories?: string
    lat?: string
    lng?: string
    distance?: string
    sort?: string
  }>
}

/**
 * Resources List Page
 * Server Component that fetches and displays all active resources
 */
export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const query = buildResourcesQueryOptions(await searchParams)

  // Fetch a capped list dataset for cards and a fuller dataset for the map.
  const [
    { data: resources, error: listError },
    { data: mapResources, error: mapError },
    { data: categoryCounts },
  ] = await Promise.all([
    getResources({ ...query, limit: 100 }),
    getResourcesForMap(query),
    getCategoryCounts(),
  ])

  const error = listError || mapError

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

  const { search, isSearching, isFiltering } = query

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
        mapResources={mapResources || resources || []}
        categoryCounts={categoryCounts || undefined}
        search={search}
        isSearching={isSearching}
        isFiltering={isFiltering}
      />
    </Container>
  )
}
