import { Container, Typography, Box, Alert } from '@mui/material'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

interface ResourceDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: ResourceDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: resource } = await supabase
    .from('resources')
    .select('name, primary_category')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!resource) {
    return {
      title: 'Resource Not Found',
    }
  }

  return {
    title: `${resource.name} | Reentry Map`,
    description: `${resource.primary_category ? `${resource.primary_category} resource` : 'Community resource'} to help with reentry`,
  }
}

export default async function ResourceDetailPage({ params }: ResourceDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Query by UUID
  const { data: resource, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
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
    </Container>
  )
}
