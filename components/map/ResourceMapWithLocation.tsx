'use client'

import { useSearchParams } from 'next/navigation'
import { ResourceMap } from './ResourceMap'
import { useUserLocation } from '@/lib/context/LocationContext'
import type { Resource } from '@/lib/types/database'
import { parseStateLocationName } from '@/lib/utils/location-scope'

interface ResourceMapWithLocationProps {
  /**
   * Resources to display on map
   */
  resources: Resource[]

  /**
   * Selected resource ID (to highlight/open)
   */
  selectedResourceId?: string | null

  /**
   * Callback when resource marker is clicked
   */
  onResourceClick?: (resourceId: string) => void

  /**
   * Map height (default: '500px')
   */
  height?: string

  /**
   * Always frame the map to the displayed resources (place-scoped browse pages
   * like a city or category-in-city), even if the visitor's location is set.
   */
  fitToResources?: boolean
}

/**
 * ResourceMap wrapper that automatically provides user location and radius from URL
 * Use this in server components that need location-based map features
 */
export function ResourceMapWithLocation({
  resources,
  selectedResourceId,
  onResourceClick,
  height = '500px',
  fitToResources = false,
}: ResourceMapWithLocationProps) {
  const { coordinates } = useUserLocation()
  const searchParams = useSearchParams()
  const locationName = searchParams.get('locationName')
  const stateLocation = parseStateLocationName(locationName)

  // Get radius from URL params
  const distanceParam = searchParams.get('distance')
  const radiusMiles = !stateLocation && distanceParam ? parseInt(distanceParam, 10) : undefined

  // Convert coordinates to userLocation format
  const userLocation =
    !stateLocation && coordinates
      ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
      : null

  return (
    <ResourceMap
      resources={resources}
      userLocation={userLocation}
      radiusMiles={radiusMiles}
      selectedResourceId={selectedResourceId}
      onResourceClick={onResourceClick}
      height={height}
      fitToResources={fitToResources}
    />
  )
}
