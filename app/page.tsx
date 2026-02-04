import { Container, Box, Typography, Button, Card, CardContent, Chip, Grid } from '@mui/material'
import {
  Work as WorkIcon,
  Home as HomeIcon,
  Restaurant as FoodIcon,
  LocalHospital as HealthIcon,
  Checkroom as ClothingIcon,
  Gavel as LegalIcon,
  DirectionsBus as TransportIcon,
  School as EducationIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { getResources, getResourceCount } from '@/lib/api/resources'
import { HeroSearch } from '@/components/search/HeroSearch'
import { FeaturedResourcesList } from '@/components/resources/FeaturedResourcesList'
import {
  generateNationalCategoryUrl,
  generateCityUrl,
  generateCategoryInCityUrl,
} from '@/lib/utils/urls'
import type { ResourceCategory } from '@/lib/types/database'
import { PageViewTracker } from '@/components/analytics/PageViewTracker'

// Force dynamic rendering since we fetch data from database
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Fetch some featured resources and total count
  const [{ data: featuredResources }, { data: resourceCount }] = await Promise.all([
    getResources({ limit: 6, sort: { field: 'rating_average', direction: 'desc' } }),
    getResourceCount(),
  ])

  const categories = [
    { name: 'Employment', icon: WorkIcon, slug: 'employment', color: '#1976d2' },
    { name: 'Housing', icon: HomeIcon, slug: 'housing', color: '#388e3c' },
    { name: 'Food', icon: FoodIcon, slug: 'food', color: '#f57c00' },
    { name: 'Healthcare', icon: HealthIcon, slug: 'healthcare', color: '#d32f2f' },
    { name: 'Clothing', icon: ClothingIcon, slug: 'clothing', color: '#7b1fa2' },
    { name: 'Legal Aid', icon: LegalIcon, slug: 'legal-aid', color: '#0288d1' },
    { name: 'Transportation', icon: TransportIcon, slug: 'transportation', color: '#689f38' },
    { name: 'Education', icon: EducationIcon, slug: 'education', color: '#f57c00' },
  ]

  return (
    <>
      <PageViewTracker pageTitle="Home - Find Reentry Resources" />
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '3.5rem' },
              }}
            >
              Find what you need to succeed
            </Typography>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                mb: 4,
                color: '#fff',
                fontSize: { xs: '1.1rem', md: '1.5rem' },
              }}
            >
              Employment, housing, food, healthcare, and more in your community
            </Typography>

            {/* Search Bar */}
            <Box sx={{ maxWidth: 700, mx: 'auto' }}>
              <HeroSearch />
            </Box>

            {/* Resource count */}
            {resourceCount !== null && (
              <Typography sx={{ mt: 3, color: '#fff' }}>
                <strong>{resourceCount}</strong> active resources available
              </Typography>
            )}
          </Box>
        </Container>
      </Box>

      {/* Categories Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
          I&apos;m looking for...
        </Typography>
        <Grid container spacing={3}>
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={category.slug}>
                <Link
                  href={generateNationalCategoryUrl(category.slug as ResourceCategory)}
                  style={{ textDecoration: 'none', height: '100%', display: 'block' }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          bgcolor: category.color,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        <Icon sx={{ fontSize: 32 }} />
                      </Box>
                      <Typography variant="h6" component="div">
                        {category.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Link>
              </Grid>
            )
          })}
        </Grid>
      </Container>

      {/* Featured Resources Section */}
      {featuredResources && featuredResources.length > 0 && (
        <Box sx={{ bgcolor: 'background.default', py: 6 }}>
          <Container maxWidth="lg">
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}
            >
              <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
                Top-Rated Resources
              </Typography>
              <Link href="/resources" style={{ textDecoration: 'none' }}>
                <Button variant="outlined">View All</Button>
              </Link>
            </Box>
            <FeaturedResourcesList resources={featuredResources} />
          </Container>
        </Box>
      )}

      {/* Call to Action Section */}
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
          Know a Great Resource?
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}
        >
          Help us build a comprehensive directory by suggesting resources that have helped you or
          others in your community.
        </Typography>
        <Link href="/suggest-resource" style={{ textDecoration: 'none' }}>
          <Button variant="contained" size="large">
            Suggest a Resource
          </Button>
        </Link>
      </Container>

      {/* SEO Footer - Find Resources by Location */}
      <Box sx={{ bgcolor: 'background.default', py: 4, borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="h6" gutterBottom>
            Find Resources by Location
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Browse verified reentry resources in Bay Area cities
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Link href={generateCityUrl('Oakland', 'CA')} style={{ textDecoration: 'none' }}>
              <Chip label="Oakland, CA" clickable color="primary" />
            </Link>
            <Link
              href={generateCategoryInCityUrl('Oakland', 'CA', 'employment' as ResourceCategory)}
              style={{ textDecoration: 'none' }}
            >
              <Chip label="Employment in Oakland" clickable />
            </Link>
            <Link
              href={generateCategoryInCityUrl('Oakland', 'CA', 'housing' as ResourceCategory)}
              style={{ textDecoration: 'none' }}
            >
              <Chip label="Housing in Oakland" clickable />
            </Link>
            <Link
              href={generateCategoryInCityUrl('Oakland', 'CA', 'food' as ResourceCategory)}
              style={{ textDecoration: 'none' }}
            >
              <Chip label="Food in Oakland" clickable />
            </Link>
            <Link href={generateCityUrl('San Francisco', 'CA')} style={{ textDecoration: 'none' }}>
              <Chip label="San Francisco, CA" clickable />
            </Link>
            <Link
              href={generateCategoryInCityUrl(
                'San Francisco',
                'CA',
                'employment' as ResourceCategory
              )}
              style={{ textDecoration: 'none' }}
            >
              <Chip label="Employment in San Francisco" clickable />
            </Link>
            <Link href={generateCityUrl('Berkeley', 'CA')} style={{ textDecoration: 'none' }}>
              <Chip label="Berkeley, CA" clickable />
            </Link>
            <Link
              href={generateCategoryInCityUrl('Berkeley', 'CA', 'housing' as ResourceCategory)}
              style={{ textDecoration: 'none' }}
            >
              <Chip label="Housing in Berkeley" clickable />
            </Link>
            <Link
              href={generateCategoryInCityUrl('Oakland', 'CA', 'legal-aid' as ResourceCategory)}
              style={{ textDecoration: 'none' }}
            >
              <Chip label="Legal Aid in Oakland" clickable />
            </Link>
            <Link
              href={generateCategoryInCityUrl('Oakland', 'CA', 'mental-health' as ResourceCategory)}
              style={{ textDecoration: 'none' }}
            >
              <Chip label="Mental Health in Oakland" clickable />
            </Link>
          </Box>
        </Container>
      </Box>
    </>
  )
}
