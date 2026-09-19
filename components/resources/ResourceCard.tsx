'use client'

import React from 'react'
import NextLink from 'next/link'
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
import { Navigation as NavigationIcon, Phone as PhoneIcon } from '@mui/icons-material'
import type { Resource, ResourceCategory } from '@/lib/types/database'
import { calculateDistance, formatDistanceSmart } from '@/lib/utils/distance'
import { useUserLocation } from '@/lib/context/LocationContext'
import { getResourceUrl } from '@/lib/utils/resource-url'
import { getCategoryLabel } from '@/lib/utils/categories'
import { FavoriteButton } from '@/components/user/FavoriteButton'
import { AIVerifiedBadge } from './AIVerifiedBadge'
import { recordSearchContact } from '@/lib/analytics/search-journey'
import { analytics } from '@/lib/analytics/queue'
import {
  getResourceAddressType,
  getResourceServiceArea,
  getServiceAreaHeading,
  getServiceAreaSummary,
  shouldShowDirectionsForResource,
} from '@/lib/utils/resource-location'

export type ResourceCardResource = {
  id?: string
  name: string
  primary_category?: string | null
  description?: string | null
  services_offered?: string[] | null
  eligibility_requirements?: string | null
  phone?: string | null
  email?: string | null
  appointment_required?: boolean | null
  ai_last_verified?: string | null
  verified_date?: string | null
  verified_by?: string | null
  address?: string | null
  addressType?: string | null
  address_type?: string | null
  city?: string | null
  state?: string | null
  serviceArea?: unknown
  service_area?: unknown
  zip?: string | null
  rating_average?: number | null
  rating_count?: number | null
  latitude?: number | null
  longitude?: number | null
  website?: string | null
  slug?: string | null
  distance?: number | null
  coverage_match?: boolean
}

interface ResourceCardProps {
  resource: ResourceCardResource | Resource
  onFavorite?: (id?: string) => void
  /** null explicitly disables cached location, e.g. for nationwide or state results. */
  userLocation?: { lat: number; lng: number } | null
  selected?: boolean
  onResourceSelect?: (id: string) => void
}

export function ResourceCard({
  resource,
  userLocation: providedLocation,
  selected,
  onResourceSelect,
}: ResourceCardProps) {
  const { coordinates: contextCoordinates } = useUserLocation()
  const userLocation =
    providedLocation !== undefined
      ? providedLocation
      : contextCoordinates
        ? { lat: contextCoordinates.latitude, lng: contextCoordinates.longitude }
        : null
  const computedDistance =
    resource.latitude != null && resource.longitude != null && userLocation
      ? calculateDistance(
          { latitude: resource.latitude, longitude: resource.longitude },
          { latitude: userLocation.lat, longitude: userLocation.lng },
          'miles'
        )
      : null
  const distance =
    computedDistance != null && Number.isFinite(computedDistance) ? computedDistance : null
  const serviceAreaHeading = getServiceAreaHeading(resource)
  const serviceAreaSummary = getServiceAreaSummary(resource)
  const showDirections = shouldShowDirectionsForResource(resource)
  const unconfirmedCoverage =
    getResourceAddressType(resource) !== 'physical' && !getResourceServiceArea(resource)
  const resourceUrl = getResourceUrl(resource)
  const fullAddress = [resource.address, resource.city, resource.state, resource.zip]
    .filter(Boolean)
    .join(', ')
  const directionsUrl =
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(fullAddress)
  const hasRatings = (resource.rating_count ?? 0) > 0 && (resource.rating_average ?? 0) > 0

  return (
    <Card
      data-testid="resource-card"
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ pb: 0 }}>
        <Link component={NextLink} href={resourceUrl} underline="hover" color="inherit">
          <Typography
            variant="h6"
            component="h2"
            sx={{ fontWeight: 700, lineHeight: 1.3, overflowWrap: 'anywhere' }}
          >
            {resource.name}
          </Typography>
        </Link>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 1, mb: 1 }}>
          {resource.primary_category && (
            <Chip
              label={getCategoryLabel(resource.primary_category as ResourceCategory)}
              size="small"
              data-testid="category-badge"
            />
          )}
          {hasRatings && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Rating value={resource.rating_average} precision={0.1} size="small" readOnly />
              <Typography variant="caption" color="text.secondary">
                ({resource.rating_count})
              </Typography>
            </Box>
          )}
        </Box>
        {resource.services_offered?.length ? (
          <Typography
            variant="body2"
            sx={{
              mb: 1,
              fontWeight: 500,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {resource.services_offered.slice(0, 3).join(' · ')}
          </Typography>
        ) : resource.description ? (
          <Typography
            variant="body2"
            sx={{
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {resource.description}
          </Typography>
        ) : null}
      </CardContent>
      <CardActions
        sx={{
          flexWrap: 'wrap',
          gap: 1,
          px: 2,
          pt: 0,
          pb: 1,
          '& > :not(style) ~ :not(style)': { ml: 0 },
        }}
      >
        {resource.phone ? (
          <Button
            href={'tel:' + resource.phone}
            variant="contained"
            startIcon={<PhoneIcon />}
            aria-label={'Call ' + resource.name}
            sx={{ minHeight: 44 }}
            onClick={() => {
              recordSearchContact('call')
              if (resource.id) analytics.track('resource_click_call', { resource_id: resource.id })
            }}
          >
            Call
          </Button>
        ) : resource.website ? (
          <Button
            href={resource.website}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            sx={{ minHeight: 44 }}
            aria-label={'Visit ' + resource.name + ' website'}
            onClick={() => recordSearchContact('website')}
          >
            Website
          </Button>
        ) : null}
        <Button
          component={NextLink}
          href={resourceUrl}
          variant="outlined"
          sx={{ minHeight: 44 }}
          aria-label={'View details for ' + resource.name}
        >
          Details
        </Button>
        {resource.id && (
          <FavoriteButton resourceId={resource.id} resource={resource} size="medium" />
        )}
        {onResourceSelect && resource.id && (
          <Button
            size="small"
            startIcon={<NavigationIcon />}
            onClick={() => onResourceSelect(resource.id!)}
            aria-label={'Show ' + resource.name + ' on map'}
            sx={{ minHeight: 44 }}
          >
            Map
          </Button>
        )}
      </CardActions>
      <CardContent sx={{ pt: 0, flexGrow: 1 }}>
        {resource.address && showDirections ? (
          <Link
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            color="text.secondary"
            title={'Get directions to ' + fullAddress}
            onClick={() => recordSearchContact('directions')}
            data-testid="resource-address"
            sx={{ display: 'block' }}
          >
            <Typography variant="body2" component="div">
              {resource.address}
            </Typography>
            <Typography variant="body2" component="div">
              {[resource.city, resource.state].filter(Boolean).join(', ')}
              {resource.zip ? ' ' + resource.zip : ''}
            </Typography>
          </Link>
        ) : serviceAreaHeading || serviceAreaSummary ? (
          <Box color="text.secondary" data-testid="resource-address">
            {serviceAreaHeading && (
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {serviceAreaHeading}
              </Typography>
            )}
            {serviceAreaSummary && <Typography variant="body2">{serviceAreaSummary}</Typography>}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" data-testid="resource-address">
            Location details unavailable
          </Typography>
        )}
        {unconfirmedCoverage && (
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
            Service area not confirmed — contact provider
          </Typography>
        )}
        {distance !== null && resource.address && showDirections && (
          <Typography
            data-testid="resource-distance"
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {formatDistanceSmart(distance, 'miles')} away
          </Typography>
        )}
        {resource.eligibility_requirements && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            <strong>Who it helps:</strong> {resource.eligibility_requirements}
          </Typography>
        )}
        {resource.ai_last_verified && (
          <Box sx={{ mt: 1.5 }}>
            <AIVerifiedBadge checkedAt={resource.ai_last_verified} />
          </Box>
        )}
        {resource.appointment_required === true && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Appointment required — contact to arrange a visit.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
export default ResourceCard
