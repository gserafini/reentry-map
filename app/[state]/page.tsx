import { cache } from 'react'
import {
  Container,
  Typography,
  Box,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
} from '@mui/material'
import { notFound } from 'next/navigation'
import { Apartment as CityIcon } from '@mui/icons-material'
import { sql } from '@/lib/db/client'
import { getResourcesCount } from '@/lib/api/resources'
import { BreadcrumbList, CollectionPage } from '@/components/seo/StructuredData'
import { parseStateSlug, generateCityUrl, generateStateUrl } from '@/lib/utils/urls'
import { US_STATE_CODE_TO_NAME } from '@/lib/utils/resource-location'
import { createOpenGraphImage } from '@/lib/seo/open-graph'
import type { Metadata } from 'next'

interface StatePageProps {
  params: Promise<{ state: string }>
}
const getStateDirectory = cache(async (state: string) => {
  const [count, cities] = await Promise.all([
    getResourcesCount({ state }),
    sql<{ city: string; count: number }[]>`SELECT city, COUNT(*)::int AS count FROM resources
      WHERE state = ${state} AND status='active' AND city IS NOT NULL
      GROUP BY city ORDER BY city`,
  ])
  return { count, cities }
})

export default async function StatePage({ params }: StatePageProps) {
  const state = parseStateSlug((await params).state)
  const stateName = US_STATE_CODE_TO_NAME[state]
  if (!stateName) notFound()
  const { count, cities } = await getStateDirectory(state)
  if (count.error)
    return (
      <Container sx={{ py: 3 }}>
        <Alert severity="error">Resources could not be loaded. Please try again.</Alert>
      </Container>
    )
  const totalResources = count.data || 0
  return (
    <>
      <BreadcrumbList
        items={[
          { name: 'Home', url: '/' },
          { name: stateName, url: generateStateUrl(state) },
        ]}
      />
      <CollectionPage
        name={'Reentry resources in ' + stateName}
        description={'Community services covering ' + stateName}
        url={generateStateUrl(state)}
        numberOfItems={totalResources}
      />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Find help in {stateName}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {totalResources.toLocaleString()} resources, including services covering this state.
        </Typography>
        <Button
          href={'/resources?state=' + state}
          variant="contained"
          sx={{ minHeight: 44, mb: 3 }}
        >
          View all resources in {stateName}
        </Button>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Browse by city
        </Typography>
        <Grid container spacing={2}>
          {cities.map(({ city }) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={city}>
              <Card variant="outlined">
                <CardActionArea href={generateCityUrl(city, state)}>
                  <CardContent sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <CityIcon color="primary" />
                    <Typography variant="h6" component="h3">
                      {city}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
        {!cities.length && (
          <Alert severity="info">
            Choose all resources above to see services covering {stateName}.
          </Alert>
        )}
        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Listings describe services and contact details when known. Contact the provider to
            confirm eligibility, intake, and current availability before traveling.
          </Typography>
        </Box>
      </Container>
    </>
  )
}
export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const state = parseStateSlug((await params).state)
  const stateName = US_STATE_CODE_TO_NAME[state]
  if (!stateName) return { title: 'Page not found | Reentry Map' }
  const title = 'Reentry resources in ' + stateName + ' | Reentry Map'
  const description =
    'Find employment, housing, food, healthcare, and support services covering ' +
    stateName +
    '. Browse by city or view all resources.'
  const url = 'https://reentrymap.org' + generateStateUrl(state)
  const { count } = await getStateDirectory(state)
  const image = createOpenGraphImage({
    kind: 'state',
    eyebrow: 'Statewide resource directory',
    title: `Find reentry help in ${stateName}`,
    description,
    location: stateName,
    count: count.error ? null : count.data,
  })
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', url, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    alternates: { canonical: url },
  }
}
export async function generateStaticParams() {
  try {
    const states = await sql<
      { state: string }[]
    >`SELECT DISTINCT state FROM resources WHERE status='active' AND state IS NOT NULL`
    return states.map((row) => ({ state: row.state.toLowerCase() }))
  } catch {
    return []
  }
}
