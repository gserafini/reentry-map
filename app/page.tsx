import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid,
} from '@mui/material'
import {
  Work as WorkIcon,
  Home as HomeIcon,
  Restaurant as FoodIcon,
  LocalHospital as HealthIcon,
  Checkroom as ClothingIcon,
  Gavel as LegalIcon,
  DirectionsBus as TransportIcon,
  School as EducationIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { getResources, getResourceCount } from '@/lib/api/resources'

// Force dynamic rendering since we fetch data with Supabase server client
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
            <Box
              id="hero-search"
              sx={{
                display: 'flex',
                gap: 0.5,
                maxWidth: 600,
                mx: 'auto',
                bgcolor: 'background.paper',
                p: '6px',
                borderRadius: 2,
                boxShadow: 1,
              }}
            >
              <TextField
                fullWidth
                placeholder="Search for resources..."
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                    '& fieldset': {
                      border: 'none',
                    },
                    '& input': {
                      py: 1.25,
                    },
                  },
                }}
              />
              <Link href="/resources" style={{ textDecoration: 'none' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SearchIcon />}
                  sx={{
                    px: 2.5,
                    py: 1.25,
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  Search
                </Button>
              </Link>
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
          Browse by Category
        </Typography>
        <Grid container spacing={3}>
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={category.slug}>
                <Link
                  href={`/resources/category/${category.slug}`}
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
            <Grid container spacing={3}>
              {featuredResources.map((resource) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={resource.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div" gutterBottom>
                        {resource.name}
                      </Typography>
                      {resource.primary_category && (
                        <Chip label={resource.primary_category} size="small" sx={{ mb: 1 }} />
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {resource.address}
                      </Typography>
                      {resource.description && (
                        <Typography
                          variant="body2"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {resource.description}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Link href={`/resources/${resource.id}`} style={{ textDecoration: 'none' }}>
                        <Button size="small">Learn More</Button>
                      </Link>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
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

      {/* SEO Landing Page Test Links (temporary for development) */}
      <Box sx={{ bgcolor: 'background.default', py: 4, borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="h6" gutterBottom>
            Find Resources by Location (SEO Landing Pages)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Test links for SEO-friendly localized pages
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Link href="/search" style={{ textDecoration: 'none' }}>
              <Chip label="Search (Base)" clickable color="primary" />
            </Link>
            <Link href="/search/employment-in-oakland-ca" style={{ textDecoration: 'none' }}>
              <Chip label="Employment in Oakland, CA" clickable />
            </Link>
            <Link href="/search/housing-in-oakland-ca" style={{ textDecoration: 'none' }}>
              <Chip label="Housing in Oakland, CA" clickable />
            </Link>
            <Link href="/search/food-assistance-in-oakland-ca" style={{ textDecoration: 'none' }}>
              <Chip label="Food Assistance in Oakland, CA" clickable />
            </Link>
            <Link href="/search/employment-in-san-francisco-ca" style={{ textDecoration: 'none' }}>
              <Chip label="Employment in San Francisco, CA" clickable />
            </Link>
            <Link href="/search/housing-in-berkeley-ca" style={{ textDecoration: 'none' }}>
              <Chip label="Housing in Berkeley, CA" clickable />
            </Link>
            <Link href="/search/legal-aid-in-oakland-ca" style={{ textDecoration: 'none' }}>
              <Chip label="Legal Aid in Oakland, CA" clickable />
            </Link>
            <Link
              href="/search/mental-health-services-in-oakland-ca"
              style={{ textDecoration: 'none' }}
            >
              <Chip label="Mental Health in Oakland, CA" clickable />
            </Link>
            <Link href="/search/transportation-in-oakland-ca" style={{ textDecoration: 'none' }}>
              <Chip label="Transportation in Oakland, CA" clickable />
            </Link>
          </Box>
        </Container>
      </Box>
    </>
  )
}
