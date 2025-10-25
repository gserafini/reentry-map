import { Container, Typography, Box, Alert } from '@mui/material'
import { getResources } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'

interface ResourcesPageProps {
  searchParams: Promise<{
    search?: string
  }>
}

/**
 * Resources List Page
 * Server Component that fetches and displays all active resources
 */
export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const { search } = await searchParams
  const { data: resources, error } = await getResources({ search, limit: 100 })

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {search ? `Search Results: "${search}"` : 'Community Resources'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {search
            ? 'Results matching your search query'
            : 'Browse resources in your area to help with employment, housing, food, and more.'}
        </Typography>
      </Box>

      {resources && resources.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing {resources.length} resource{resources.length !== 1 ? 's' : ''}
        </Typography>
      )}

      <ResourceList resources={resources || []} />
    </Container>
  )
}
