import { Container, Typography, Box, Alert, Grid, Paper } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import { getResources, getCategoryCounts, getResourcesCount } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMap } from '@/components/map/ResourceMap'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { Pagination } from '@/components/search/Pagination'
import { SortDropdown } from '@/components/search/SortDropdown'
import { parseSortParam } from '@/lib/utils/sort'
import type { Metadata } from 'next'

interface SearchPageProps {
  searchParams: Promise<{
    search?: string
    page?: string
    sort?: string
  }>
}

const PAGE_SIZE = 20

/**
 * Base search page
 * URL: /search/
 * Shows general search landing page with all resources
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const search = params.search
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * PAGE_SIZE
  const sort = parseSortParam(params.sort)

  const { data: resources, error } = await getResources({
    search,
    limit: PAGE_SIZE,
    offset,
    sort,
  })

  const { data: totalCount } = await getResourcesCount({ search })
  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE)

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {isSearching ? `Search Results: "${search}"` : 'Search Resources'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {isSearching
            ? `Showing results for "${search}"`
            : 'Find employment, housing, food, healthcare, and support services in your community. Browse our directory of verified resources.'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Category Filter Sidebar */}
        <Grid size={{ xs: 12, md: 3 }}>
          <CategoryFilter categoryCounts={categoryCounts || undefined} />
        </Grid>

        {/* Results */}
        <Grid size={{ xs: 12, md: 9 }}>
          {/* Sort and Near Me controls */}
          {/* Sort dropdown - location input is now in header */}
          {hasResults && (
            <Box
              sx={{
                mb: 2,
                display: 'flex',
                gap: 2,
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <SortDropdown />
            </Box>
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
