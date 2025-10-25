'use client'

import { Grid } from '@mui/material'
import { ResourceCard } from './ResourceCard'
import type { Resource } from '@/lib/types/database'

interface FeaturedResourcesListProps {
  resources: Resource[]
}

/**
 * Client component for displaying featured resources with distance calculations
 * Uses ResourceCard which automatically shows distance when user location is available
 */
export function FeaturedResourcesList({ resources }: FeaturedResourcesListProps) {
  return (
    <Grid container spacing={3}>
      {resources.map((resource) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={resource.id}>
          <ResourceCard resource={resource} />
        </Grid>
      ))}
    </Grid>
  )
}
