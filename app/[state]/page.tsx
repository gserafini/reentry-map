import {
  Container,
  Typography,
  Box,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
} from '@mui/material'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LocationOn as LocationIcon, Apartment as CityIcon } from '@mui/icons-material'
import { sql } from '@/lib/db/client'
import { BreadcrumbList, CollectionPage } from '@/components/seo/StructuredData'
import { parseStateSlug, generateCityUrl, generateStateUrl } from '@/lib/utils/urls'
import type { Metadata } from 'next'

interface StatePageProps {
  params: Promise<{
    state: string
  }>
}

/**
 * State Landing Page
 * URL: /ca, /ny, /tx, etc.
 * Shows overview of resources in a state with city directory
 */
export default async function StatePage({ params }: StatePageProps) {
  const { state: stateSlug } = await params
  const state = parseStateSlug(stateSlug)

  // Get total resource count for this state
  const [{ count: totalResources }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int as count FROM resources
    WHERE state = ${state} AND status = 'active'
  `

  if (!totalResources || totalResources === 0) {
    notFound()
  }

  // Get cities in this state with resource counts, sorted by count descending
  const cityRows = await sql<{ city: string; count: number }[]>`
    SELECT city, COUNT(*)::int as count FROM resources
    WHERE state = ${state} AND status = 'active' AND city IS NOT NULL
    GROUP BY city
    ORDER BY count DESC
    LIMIT 20
  `

  // Convert to sorted entries format
  const sortedCities: [string, number][] = cityRows.map((row) => [row.city, row.count])

  const stateUrl = generateStateUrl(state)

  return (
    <>
      {/* Structured Data for SEO */}
      <BreadcrumbList
        items={[
          { name: 'Home', url: '/' },
          { name: state, url: stateUrl },
        ]}
      />
      <CollectionPage
        name={`Reentry Resources in ${state}`}
        description={`Find ${totalResources} verified reentry resources across ${sortedCities.length} cities in ${state}.`}
        url={stateUrl}
        numberOfItems={totalResources}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Hero Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <LocationIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h3" component="h1">
              Reentry Resources in {state}
            </Typography>
          </Box>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            {totalResources} verified resources across {sortedCities.length} cities
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse community resources for individuals navigating reentry in {state}. Find
            employment, housing, food, healthcare, and support services in cities across the state.
          </Typography>
        </Box>

        {/* City Directory */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
            Browse by City
          </Typography>
          {sortedCities.length > 0 ? (
            <Grid container spacing={2}>
              {sortedCities.map(([city, count]) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={city}>
                  <Link
                    href={generateCityUrl(city, state)}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4,
                        },
                      }}
                    >
                      <CardActionArea sx={{ height: '100%' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CityIcon color="primary" />
                            <Typography variant="h6" component="h3">
                              {city}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${count} resource${count !== 1 ? 's' : ''}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Link>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              <Typography variant="body2">
                We&apos;re constantly adding new cities and resources. Check back soon!
              </Typography>
            </Alert>
          )}
        </Box>

        {/* State Overview */}
        <Box sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            About Reentry Resources in {state}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Our directory includes verified reentry resources across {state}, regularly updated to
            ensure accuracy. Each listing includes contact information, hours of operation, services
            offered, and community ratings.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a city above to browse local resources, or search for specific services you need.
          </Typography>
        </Box>
      </Container>
    </>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const { state: stateSlug } = await params
  const state = parseStateSlug(stateSlug)

  // Get resource count
  const [{ count: totalResources }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int as count FROM resources
    WHERE state = ${state} AND status = 'active'
  `

  if (!totalResources || totalResources === 0) {
    return { title: 'Page Not Found | Reentry Map' }
  }

  // Get state full name (map of common abbreviations)
  const stateNames: Record<string, string> = {
    CA: 'California',
    NY: 'New York',
    TX: 'Texas',
    FL: 'Florida',
    IL: 'Illinois',
    PA: 'Pennsylvania',
    OH: 'Ohio',
    GA: 'Georgia',
    NC: 'North Carolina',
    MI: 'Michigan',
  }
  const stateName = stateNames[state] || state

  const title = `Reentry Resources in ${stateName} (${state}) | Reentry Map`
  const description = `Find ${totalResources} verified reentry resources across ${stateName}. Browse employment, housing, food, healthcare, and support services by city. Updated daily.`
  const stateUrl = generateStateUrl(state)

  return {
    title,
    description,
    keywords: [
      `${stateName} reentry resources`,
      `${state} reentry programs`,
      `${stateName} employment services`,
      `${stateName} housing assistance`,
      'reentry support',
      'community resources',
    ].join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://reentrymap.org${stateUrl}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://reentrymap.org${stateUrl}`,
    },
  }
}

// Generate static params for all states with resources (ISR)
export async function generateStaticParams() {
  // Get all unique states that have active resources
  const states = await sql<{ state: string }[]>`
    SELECT DISTINCT state FROM resources
    WHERE status = 'active' AND state IS NOT NULL
  `

  return states.map((row) => ({
    state: row.state.toLowerCase(),
  }))
}
