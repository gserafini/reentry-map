'use client'

import React from 'react'
import {
  Card,
  CardContent,
  CardActions,
  Chip,
  Button,
  Typography,
  Box,
  Link,
  Rating,
} from '@mui/material'
import type { Resource } from '@/lib/types/database'

export type ResourceCardResource = {
  id?: string
  name: string
  primary_category?: string | null
  address?: string | null
  rating_average?: number | null
  rating_count?: number | null
  latitude?: number | null
  longitude?: number | null
  website?: string | null
  slug?: string | null
  state?: string | null
  city?: string | null
}

interface ResourceCardProps {
  resource: ResourceCardResource | Resource
  onFavorite?: (id?: string) => void
  userLocation?: { lat: number; lng: number }
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 3958.8 // miles
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const aHarv = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(toRad(b.lat))
  const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv))
  return R * c
}

export function ResourceCard({ resource, onFavorite, userLocation }: ResourceCardProps) {
  const distance =
    resource.latitude != null && resource.longitude != null && userLocation
      ? haversineDistance({ lat: resource.latitude, lng: resource.longitude }, userLocation)
      : null

  // Generate SEO-friendly URL if slug/state/city available, otherwise use UUID
  const resourceUrl =
    resource.slug && resource.state && resource.city
      ? `/resources/${resource.state}/${resource.city}/${resource.slug}`
      : `/resources/${resource.id}`

  return (
    <Card data-testid="resource-card">
      <CardContent>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
        >
          <Box>
            <Typography variant="h6" component="h2">
              {resource.name}
            </Typography>
            {resource.primary_category && (
              <Chip
                label={resource.primary_category}
                size="small"
                data-testid="category-badge"
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            {resource.rating_average != null ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Rating value={resource.rating_average} precision={0.1} size="small" readOnly />
                <Typography variant="body2" color="text.secondary">
                  ({resource.rating_count || 0})
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No ratings
              </Typography>
            )}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" data-testid="resource-address">
          {resource.address ?? 'No address'}
        </Typography>
        {distance !== null && (
          <Typography
            variant="body2"
            color="text.secondary"
            data-testid="resource-distance"
            sx={{ mt: 1 }}
          >
            {distance.toFixed(1)} mi
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            aria-label={`Save ${resource.name}`}
            onClick={() => onFavorite?.(resource.id)}
            variant="outlined"
          >
            Save
          </Button>
          {resource.website ? (
            <Link
              href={resource.website}
              aria-label={`Visit ${resource.name} website`}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              Website
            </Link>
          ) : (
            <Typography
              variant="body2"
              sx={{ color: '#616161', display: 'flex', alignItems: 'center' }}
            >
              No website
            </Typography>
          )}
        </Box>
        <Button
          size="small"
          href={resourceUrl}
          variant="contained"
          aria-label={`View details for ${resource.name}`}
        >
          Details
        </Button>
      </CardActions>
    </Card>
  )
}

export default ResourceCard
