'use client'

import React from 'react'
import { Grid, Typography, Box } from '@mui/material'
import ResourceCard, { type ResourceCardResource } from '@/components/resources/ResourceCard'

interface ResourceListProps {
  // Accept a loose resource shape here since data may be partially populated
  resources: Partial<ResourceCardResource>[]
  onFavorite?: (id?: string) => void
  userLocation?: { lat: number; lng: number }
}

export function ResourceList({ resources, onFavorite, userLocation }: ResourceListProps) {
  if (!resources || resources.length === 0) {
    return (
      <Box role="status" aria-live="polite" sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">No resources found</Typography>
      </Box>
    )
  }

  return (
    <Grid container spacing={3} data-testid="resource-list">
      {resources.map((r) => {
        // ensure name exists for key and props
        const key = r.id ?? r.name ?? Math.random().toString(36).slice(2, 9)

        const resourceObj: ResourceCardResource = {
          name: r.name ?? 'Unknown',
          id: r.id,
          primary_category: r.primary_category ?? null,
          address: r.address ?? null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          rating_average: r.rating_average ?? null,
          rating_count: r.rating_count ?? null,
          website: r.website ?? null,
          slug: r.slug ?? null,
          state: r.state ?? null,
          county: r.county ?? null,
        }

        return (
          <Grid key={String(key)} size={{ xs: 12, sm: 6, md: 4 }}>
            <ResourceCard
              resource={resourceObj}
              onFavorite={onFavorite}
              userLocation={userLocation}
            />
          </Grid>
        )
      })}
    </Grid>
  )
}

export default ResourceList
