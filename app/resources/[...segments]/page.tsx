import { Container, Typography, Box, Alert } from '@mui/material'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

interface ResourceDetailPageProps {
  params: Promise<{
    segments: string[]
  }>
}

/**
 * Resource Detail Page with dual URL support
 * Handles both:
 * - UUID: /resources/{uuid}
 * - SEO: /resources/{state}/{city}/{slug}
 */
export default async function ResourceDetailPage({ params }: ResourceDetailPageProps) {
  const { segments } = await params
  const supabase = await createClient()

  let resource

  // Determine URL format based on number of segments
  if (segments.length === 1) {
    // UUID format: /resources/{id}
    const [id] = segments
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    resource = data
    if (error) {
      notFound()
    }
  } else if (segments.length === 3) {
    // SEO format: /resources/{state}/{city}/{slug}
    const [state, city, slug] = segments
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('slug', slug)
      .eq('state', state)
      .eq('city', city)
      .eq('status', 'active')
      .single()

    resource = data
    if (error) {
      notFound()
    }
  } else {
    // Invalid URL format
    notFound()
  }

  if (!resource) {
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
        <Typography>Name: {resource.name}</Typography>
        {resource.slug && <Typography>Slug: {resource.slug}</Typography>}
        {resource.state && <Typography>State: {resource.state}</Typography>}
        {resource.city && <Typography>City: {resource.city}</Typography>}
        <Typography>Address: {resource.address}</Typography>
        <Typography>Category: {resource.primary_category}</Typography>
      </Box>
    </Container>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ResourceDetailPageProps): Promise<Metadata> {
  const { segments } = await params
  const supabase = await createClient()

  let resourceName = 'Resource'

  // Fetch resource name based on URL format
  if (segments.length === 1) {
    const [id] = segments
    const { data } = await supabase
      .from('resources')
      .select('name, primary_category')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    resourceName = data?.name || 'Resource'
  } else if (segments.length === 3) {
    const [state, city, slug] = segments
    const { data } = await supabase
      .from('resources')
      .select('name, primary_category')
      .eq('slug', slug)
      .eq('state', state)
      .eq('city', city)
      .eq('status', 'active')
      .single()

    resourceName =
      data?.name ||
      slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
  }

  return {
    title: `${resourceName} | Reentry Map`,
    description: `Information about ${resourceName} and how to access their services.`,
  }
}
