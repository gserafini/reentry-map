import { Container, Typography, Box, Alert } from '@mui/material'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface ResourceDetailPageProps {
  params: Promise<{
    state: string
    county: string
    slug: string
  }>
}

/**
 * Resource Detail Page with SEO-friendly URLs
 * Route: /resources/[state]/[county]/[slug]
 * Example: /resources/ca/alameda/alameda-county-health-services
 */
export default async function ResourceDetailPage({ params }: ResourceDetailPageProps) {
  const { state, county, slug } = await params
  const supabase = await createClient()

  // Query by slug, state, and county for accuracy
  const { data: resource, error } = await supabase
    .from('resources')
    .select('*')
    .eq('slug', slug)
    .eq('state', state)
    .eq('county', county)
    .eq('status', 'active')
    .single()

  if (error || !resource) {
    notFound()
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {resource.name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Resource Detail Page (Coming Soon)
        </Typography>
      </Box>

      <Alert severity="info">
        This is a placeholder for the full resource detail page. Will be implemented in Phase 3.3.
      </Alert>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Resource Info:
        </Typography>
        <Typography>ID: {resource.id}</Typography>
        <Typography>Slug: {resource.slug}</Typography>
        <Typography>State: {resource.state}</Typography>
        <Typography>County: {resource.county}</Typography>
        <Typography>Address: {resource.address}</Typography>
      </Box>
    </Container>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ResourceDetailPageProps) {
  const { slug } = await params

  // Convert slug to title case for display
  const title = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: `${title} - Reentry Map`,
    description: `Information about ${title} and how to access their services.`,
  }
}
