import { Container, Typography, Box, Alert, Grid, Paper, Card } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import { getResources, getCategoryCounts, getResourcesCount } from '@/lib/api/resources'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMapWithLocation } from '@/components/map/ResourceMapWithLocation'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { LocationFilterSidebar } from '@/components/search/LocationFilterSidebar'
import { Pagination } from '@/components/search/Pagination'
import { SortDropdown } from '@/components/search/SortDropdown'
import { SearchPageHeader } from '@/components/search/SearchPageHeader'
import { parseSortParam } from '@/lib/utils/sort'
import type { Metadata } from 'next'

interface SearchPageProps {
  searchParams: Promise<{
    search?: string
    page?: string
    sort?: string
    lat?: string
    lng?: string
    distance?: string
    locationName?: string
  }>
}

const PAGE_SIZE = 20

/**
 * Base search page
 * URL: /search/
 * Shows general search landing page with all resources
 * Supports location-based filtering via lat/lng/distance query params
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const search = params.search
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * PAGE_SIZE
  const sort = parseSortParam(params.sort)

  // Parse location parameters
  const lat = params.lat ? parseFloat(params.lat) : undefined
  const lng = params.lng ? parseFloat(params.lng) : undefined
  const distance = params.distance ? parseInt(params.distance, 10) : undefined
  const locationName = params.locationName

  // Determine if we have valid location for filtering
  const hasLocation =
    lat !== undefined && !isNaN(lat) && lng !== undefined && !isNaN(lng) && distance

  // First, try to get resources within radius if location is provided
  let resources = null
  let withinRadiusCount = 0
  let error = null

  if (hasLocation) {
    const nearbyResult = await getResources({
      search,
      latitude: lat,
      longitude: lng,
      radius_miles: distance,
      limit: PAGE_SIZE,
      offset,
      sort,
    })

    if (nearbyResult.error) {
      error = nearbyResult.error
    } else {
      withinRadiusCount = nearbyResult.data?.length || 0

      if (withinRadiusCount > 0) {
        // Found results within radius
        resources = nearbyResult.data
      } else {
        // No results within radius - get ALL results sorted by distance
        const allResult = await getResources({
          search,
          latitude: lat,
          longitude: lng,
          radius_miles: undefined, // No radius limit
          limit: PAGE_SIZE,
          offset,
          sort: { field: 'distance', direction: 'asc' }, // Sort by distance
        })

        if (allResult.error) {
          error = allResult.error
        } else {
          resources = allResult.data
        }
      }
    }
  } else {
    // No location filtering - standard search
    const result = await getResources({
      search,
      limit: PAGE_SIZE,
      offset,
      sort,
    })

    resources = result.data
    error = result.error
  }

  // Get total count for pagination
  const { data: totalCount } = await getResourcesCount({
    search,
    ...(hasLocation && withinRadiusCount > 0
      ? { latitude: lat, longitude: lng, radius_miles: distance }
      : {}),
  })

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE)

  // Get category counts with current filters applied
  const { data: categoryCounts } = await getCategoryCounts({
    search,
    ...(hasLocation ? { latitude: lat, longitude: lng, radius_miles: distance } : {}),
  })

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
  const noResultsWithinRadius = hasLocation && withinRadiusCount === 0 && hasResults

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <SearchPageHeader search={search} />

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

          {/* No results at all */}
          {!hasResults && (
            <Alert severity="info" icon={<SearchOffIcon />} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {hasLocation
                  ? `No results found within ${distance} miles of ${locationName || 'your location'}`
                  : 'No resources found'}
              </Typography>
              <Typography variant="body2">
                We&apos;re constantly adding new resources. Check back soon.
              </Typography>
            </Alert>
          )}

          {/* Map with location-based zoom - show if has results OR has location set */}
          {(hasResults || hasLocation) && (
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

          {/* No results within radius - showing nearby results */}
          {noResultsWithinRadius && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  No results found within {distance} miles of {locationName || 'your location'}
                </Typography>
              </Alert>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  Nearby Results
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Showing all available results sorted by distance
                </Typography>
              </Box>
            </>
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
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams
  const search = params.search
  const locationName = params.locationName

  // Build dynamic title and description
  let title = 'Search Resources | Reentry Map'
  let description =
    'Find employment, housing, food, healthcare, and support services in your community. Browse our verified directory of reentry resources.'
  let keywords = [
    'reentry resources',
    'employment assistance',
    'housing support',
    'food assistance',
    'healthcare services',
    'reentry programs',
    'criminal justice',
    'community resources',
  ]

  if (search && locationName) {
    title = `${search} Resources near ${locationName} | Reentry Map`
    description = `Find ${search} resources and services near ${locationName}. Connect with verified programs offering employment, housing, healthcare, and support for individuals navigating reentry.`
    keywords = [search, locationName, 'reentry services', ...keywords]
  } else if (search) {
    title = `${search} Resources | Reentry Map`
    description = `Search verified ${search} resources and programs. Find employment, housing, food, healthcare, and support services for individuals navigating reentry.`
    keywords = [search, 'reentry resources', ...keywords]
  } else if (locationName) {
    title = `Resources near ${locationName} | Reentry Map`
    description = `Browse verified reentry resources near ${locationName}. Find employment, housing, food, healthcare, and community support services in your area.`
    keywords = [locationName, 'local resources', 'community services', ...keywords]
  }

  return {
    title,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Reentry Map',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
