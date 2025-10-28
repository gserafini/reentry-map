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
import { Navigation as NavigationIcon } from '@mui/icons-material'
import type { Resource } from '@/lib/types/database'
import { calculateDistance, formatDistanceSmart } from '@/lib/utils/distance'
import { useUserLocation } from '@/lib/context/LocationContext'
import { getResourceUrl } from '@/lib/utils/resource-url'

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
  /**
   * Optional user location. If not provided, will use location from LocationContext
   */
  userLocation?: { lat: number; lng: number }
}

export function ResourceCard({
  resource,
  onFavorite,
  userLocation: providedLocation,
}: ResourceCardProps) {
  // Get user location from context if not provided as prop
  const { coordinates: contextCoordinates } = useUserLocation()

  // Use provided location or context location
  const userLocation =
    providedLocation ||
    (contextCoordinates
      ? {
          lat: contextCoordinates.latitude,
          lng: contextCoordinates.longitude,
        }
      : null)

  // Calculate distance if we have both resource and user coordinates
  const distance =
    resource.latitude != null && resource.longitude != null && userLocation
      ? calculateDistance(
          { latitude: resource.latitude, longitude: resource.longitude },
          { latitude: userLocation.lat, longitude: userLocation.lng },
          'miles'
        )
      : null

  // Generate SEO-friendly URL
  const resourceUrl = getResourceUrl(resource)

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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 1,
            }}
            data-testid="resource-distance"
          >
            <NavigationIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
              {formatDistanceSmart(distance, 'miles')} away
            </Typography>
          </Box>
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
