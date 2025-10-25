import { Container, Typography, Box, Alert, Button } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import Link from 'next/link'
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

  const hasResults = resources && resources.length > 0
  const isSearching = Boolean(search && search.trim())

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

      {/* Results count */}
      {hasResults && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing {resources.length} resource{resources.length !== 1 ? 's' : ''}
        </Typography>
      )}

      {/* No results state for search */}
      {isSearching && !hasResults && (
        <Alert
          severity="info"
          icon={<SearchOffIcon />}
          sx={{ mb: 3 }}
          action={
            <Link href="/resources" style={{ textDecoration: 'none' }}>
              <Button color="inherit" size="small">
                Clear Search
              </Button>
            </Link>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            No results found for &ldquo;{search}&rdquo;
          </Typography>
          <Typography variant="body2">
            Try adjusting your search terms or browse all resources.
          </Typography>
        </Alert>
      )}

      <ResourceList resources={resources || []} />
    </Container>
  )
}
