'use client'

import { useSearchParams } from 'next/navigation'
import { ResourceMap } from './ResourceMap'
import { useUserLocation } from '@/lib/context/LocationContext'
import type { Resource } from '@/lib/types/database'

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
}: ResourceMapWithLocationProps) {
  const { coordinates } = useUserLocation()
  const searchParams = useSearchParams()

  // Get radius from URL params
  const distanceParam = searchParams.get('distance')
  const radiusMiles = distanceParam ? parseInt(distanceParam, 10) : undefined

  // Convert coordinates to userLocation format
  const userLocation = coordinates
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
    />
  )
}
