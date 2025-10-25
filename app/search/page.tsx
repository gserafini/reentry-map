import { Container, Typography, Box, Alert, Grid } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import { getResources, getCategoryCounts } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import type { Metadata } from 'next'

/**
 * Base search page
 * URL: /search/
 * Shows general search landing page with all resources
 */
export default async function SearchPage() {
  const { data: resources, error } = await getResources({
    limit: 100,
  })

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Search Resources
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Find employment, housing, food, healthcare, and support services in your community. Browse
          our directory of verified resources.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Category Filter Sidebar */}
        <Grid size={{ xs: 12, md: 3 }}>
          <CategoryFilter categoryCounts={categoryCounts || undefined} />
        </Grid>

        {/* Results */}
        <Grid size={{ xs: 12, md: 9 }}>
          {hasResults && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {resources.length} resource{resources.length !== 1 ? 's' : ''}
            </Typography>
          )}

          {!hasResults && (
            <Alert severity="info" icon={<SearchOffIcon />} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                No resources found
              </Typography>
              <Typography variant="body2">
                We&apos;re constantly adding new resources. Check back soon.
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
export function generateMetadata(): Metadata {
  return {
    title: 'Search Resources | Reentry Map',
    description:
      'Find employment, housing, food, healthcare, and support services in your community. Browse our directory of verified resources for individuals navigating reentry.',
    openGraph: {
      title: 'Search Resources | Reentry Map',
      description:
        'Find employment, housing, food, healthcare, and support services in your community.',
      type: 'website',
    },
  }
}
