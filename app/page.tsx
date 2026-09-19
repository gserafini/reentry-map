import { Suspense } from 'react'
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Link as MuiLink,
} from '@mui/material'
import Link from 'next/link'
import { getResources, getResourceCount } from '@/lib/api/resources'
import { HeroSearch } from '@/components/search/HeroSearch'
import { LocationUrlSync } from '@/components/search/LocationUrlSync'
import { ResourceList } from '@/components/resources/ResourceList'
import { PageViewTracker } from '@/components/analytics/PageViewTracker'
import { getAllCategories, getCategoryLabel, getCategoryDescription } from '@/lib/utils/categories'
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/category-icons'
import { US_STATE_CODE_TO_NAME } from '@/lib/utils/resource-location'
import { resolveSearchLocation } from '@/lib/utils/search-location'
import { buildResourcesQueryOptions, type ResourcesPageSearchParams } from '@/app/resources/params'

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<ResourcesPageSearchParams>
}) {
  const params = await searchParams
  const locationParams = new URLSearchParams()
  for (const key of [
    'lat',
    'lng',
    'distance',
    'locationName',
    'north',
    'south',
    'east',
    'west',
  ] as const) {
    if (params[key]) locationParams.set(key, params[key])
  }
  const location = resolveSearchLocation(locationParams)
  const hasLocation = Boolean(location.coordinates || location.state || location.viewportBounds)
  const [{ data: localResources, error }, { data: resourceCount }] = await Promise.all([
    hasLocation
      ? getResources({ ...buildResourcesQueryOptions(params), limit: 6 })
      : Promise.resolve({ data: null, error: null }),
    getResourceCount(),
  ])
  const browseUrl = '/resources' + (locationParams.size ? '?' + locationParams.toString() : '')
  const userLocation = location.coordinates
    ? { lat: location.coordinates.latitude, lng: location.coordinates.longitude }
    : null

  return (
    <>
      <PageViewTracker pageTitle="Home - Find Reentry Resources" />
      <Suspense fallback={null}>
        <LocationUrlSync />
      </Suspense>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: { xs: 3, md: 6 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              component="h1"
              sx={{ fontWeight: 700, fontSize: { xs: '1.9rem', md: '3rem' }, mb: 1.5 }}
            >
              Find help for your next step
            </Typography>
            <Typography sx={{ mb: 3, color: '#fff', fontSize: { xs: '1rem', md: '1.25rem' } }}>
              Housing, jobs, food, healthcare, and support near you.
            </Typography>
            <Box sx={{ maxWidth: 760, mx: 'auto' }}>
              <HeroSearch />
            </Box>
            <Typography variant="body2" sx={{ mt: 2, color: '#fff' }}>
              Free to search. No account needed.
              {resourceCount != null
                ? ' ' + resourceCount.toLocaleString('en-US') + ' listings across the U.S.'
                : ''}
            </Typography>
          </Box>
        </Container>
      </Box>

      {hasLocation && (
        <Container maxWidth="lg" component="section" sx={{ py: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
              {location.state ? 'Help across ' : 'Help near '}
              {location.label}
            </Typography>
            <Button href={browseUrl} variant="outlined">
              See all results
            </Button>
          </Box>
          {localResources?.length ? (
            <ResourceList resources={localResources} userLocation={userLocation} />
          ) : (
            <Typography color="text.secondary">
              {error
                ? 'We could not load local suggestions. Please try your search again.'
                : 'Choose a service below or try a nearby location to find more options.'}
            </Typography>
          )}
        </Container>
      )}

      <Container maxWidth="lg" component="section" sx={{ py: 3 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 700 }}>
          What do you need help with?
        </Typography>
        <Grid container spacing={1.5}>
          {getAllCategories().map((category) => {
            const Icon = getCategoryIcon(category)
            const query = new URLSearchParams(locationParams)
            query.set('categories', category)
            return (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={category}>
                <Link
                  href={'/resources?' + query.toString()}
                  style={{ textDecoration: 'none', height: '100%', display: 'block' }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      borderRadius: 2,
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Icon sx={{ fontSize: 28, color: getCategoryColor(category), mb: 0.5 }} />
                      <Typography sx={{ fontWeight: 600 }}>{getCategoryLabel(category)}</Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: { xs: 'none', sm: 'block' } }}
                      >
                        {getCategoryDescription(category)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Link>
              </Grid>
            )
          })}
        </Grid>
      </Container>

      <Box
        component="section"
        sx={{ bgcolor: 'background.default', borderTop: 1, borderColor: 'divider', py: 3 }}
      >
        <Container maxWidth="lg">
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
            Find help in another state
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Planning a move or helping someone elsewhere? Browse by state.
          </Typography>
          <Box component="details">
            <Box
              component="summary"
              sx={{
                cursor: 'pointer',
                minHeight: 44,
                display: 'list-item',
                fontWeight: 600,
                color: 'primary.main',
                pt: 1,
              }}
            >
              Browse all states and Washington, DC
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: 1,
              }}
            >
              {Object.entries(US_STATE_CODE_TO_NAME)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([code, name]) => (
                  <MuiLink
                    key={code}
                    href={'/' + code.toLowerCase()}
                    sx={{ minHeight: 44, display: 'flex', alignItems: 'center' }}
                  >
                    {name}
                  </MuiLink>
                ))}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Help keep the directory useful
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Know a resource we should add? Share it with us for review.
        </Typography>
        <Button href="/suggest-resource" variant="outlined">
          Suggest a resource
        </Button>
      </Container>
    </>
  )
}
