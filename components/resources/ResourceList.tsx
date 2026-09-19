'use client'

import React from 'react'
import { Grid, Typography, Box } from '@mui/material'
import ResourceCard, { type ResourceCardResource } from '@/components/resources/ResourceCard'
import { groupResourcesByLocation } from '@/lib/utils/resource-groups'

interface ResourceListProps {
  resources: Partial<ResourceCardResource>[]
  onFavorite?: (id?: string) => void
  userLocation?: { lat: number; lng: number } | null
  singleColumn?: boolean
  selectedResourceId?: string | null
  onResourceSelect?: (id: string) => void
  groupByLocationType?: boolean
}

export function ResourceList({
  resources,
  onFavorite,
  userLocation,
  singleColumn,
  selectedResourceId,
  onResourceSelect,
  groupByLocationType = false,
}: ResourceListProps) {
  if (!resources || resources.length === 0) {
    return (
      <Box role="status" aria-live="polite" sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">No resources found</Typography>
      </Box>
    )
  }
  const renderCards = (
    entries: Array<{ resource: Partial<ResourceCardResource>; originalIndex: number }>
  ) => (
    <Grid container spacing={2}>
      {entries.map(({ resource, originalIndex }) => (
        <Grid
          key={resource.id ?? resource.name ?? originalIndex}
          id={resource.id ? 'resource-' + resource.id : undefined}
          data-result-position={originalIndex + 1}
          size={singleColumn ? 12 : { xs: 12, sm: 6, md: 4 }}
          sx={{ scrollMarginTop: 100 }}
        >
          <ResourceCard
            resource={{ ...resource, name: resource.name ?? 'Resource details unavailable' }}
            onFavorite={onFavorite}
            userLocation={userLocation}
            selected={Boolean(resource.id && resource.id === selectedResourceId)}
            onResourceSelect={onResourceSelect}
          />
        </Grid>
      ))}
    </Grid>
  )
  return (
    <Box data-testid="resource-list">
      {groupByLocationType
        ? groupResourcesByLocation(resources).map((group, index) => (
            <Box
              component="section"
              aria-label={group.label}
              key={group.type}
              sx={{ mt: index ? 3 : 0 }}
            >
              <Typography component="h2" variant="subtitle2" sx={{ mb: 0.75, fontWeight: 700 }}>
                {group.label}
              </Typography>
              {renderCards(group.entries)}
            </Box>
          ))
        : renderCards(resources.map((resource, originalIndex) => ({ resource, originalIndex })))}
    </Box>
  )
}
export default ResourceList
