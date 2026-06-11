'use client'

import { useEffect, useRef, useState } from 'react'
import { Box, CircularProgress, Alert } from '@mui/material'
import type { Resource, ResourceCategory } from '@/lib/types/database'
import { initializeGoogleMaps } from '@/lib/google-maps'
import { createCategoryMarkerElement } from '@/lib/utils/map-marker-icon'
import { normalizeAddressType } from '@/lib/utils/resource-location'

interface SingleResourceMapProps {
  /**
   * Resource to display on map
   */
  resource: Resource

  /**
   * Map height (default: '400px')
   */
  height?: string

  /**
   * Show info window by default
   */
  showInfo?: boolean
}

const DEFAULT_ZOOM = 15
const APPROXIMATE_LOCATION_ZOOM = 10

type ApproximateServiceArea = {
  type?: string | null
  values?: string[] | null
}

type ResourceWithApproximateFields = Resource & {
  addressType?: string | null
  address_type?: string | null
  serviceArea?: ApproximateServiceArea | null
  service_area?: ApproximateServiceArea | null
}

function hasValidCoordinates(resource: Pick<Resource, 'latitude' | 'longitude'>): resource is Pick<
  Resource,
  'latitude' | 'longitude'
> & {
  latitude: number
  longitude: number
} {
  return Number.isFinite(resource.latitude) && Number.isFinite(resource.longitude)
}

function getMapZoom(resource: Resource): number {
  const approximateLocation = getApproximateLocationPresentation(resource)
  if (approximateLocation) {
    return approximateLocation.zoom
  }

  return DEFAULT_ZOOM
}

function getApproximateLocationPresentation(resource: Resource): {
  label: string
  radiusMeters: number
  zoom: number
} | null {
  const resourceWithApproximateFields = resource as ResourceWithApproximateFields
  const addressType = normalizeAddressType(
    resourceWithApproximateFields.addressType ?? resourceWithApproximateFields.address_type
  )

  if (addressType === 'physical') {
    return null
  }

  const serviceAreaType = (
    resourceWithApproximateFields.serviceArea?.type ||
    resourceWithApproximateFields.service_area?.type ||
    'city'
  ).toLowerCase()

  switch (serviceAreaType) {
    case 'county':
      return { label: 'Approximate county-level location', radiusMeters: 20000, zoom: 9 }
    case 'region':
      return { label: 'Approximate regional location', radiusMeters: 45000, zoom: 8 }
    case 'statewide':
      return { label: 'Approximate statewide anchor location', radiusMeters: 120000, zoom: 7 }
    case 'nationwide':
      return { label: 'Approximate anchor location', radiusMeters: 250000, zoom: 5 }
    case 'city':
    default:
      return {
        label: 'Approximate city-level location',
        radiusMeters: 10000,
        zoom: APPROXIMATE_LOCATION_ZOOM,
      }
  }
}

/**
 * SingleResourceMap component
 * Displays a single resource location on an interactive Google Map
 * Optimized for resource detail pages
 */
export function SingleResourceMap({
  resource,
  height = '400px',
  showInfo = false,
}: SingleResourceMapProps) {
  const hasCoordinates = hasValidCoordinates(resource)
  const approximateLocation = getApproximateLocationPresentation(resource)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const approximateCircleRef = useRef<google.maps.Circle | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Wait for client-side hydration to complete
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize map
  useEffect(() => {
    if (!isMounted || !hasCoordinates) return // Wait for client-side hydration

    let isComponentMounted = true

    async function initMap() {
      if (!mapRef.current) {
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Load Google Maps libraries
        await initializeGoogleMaps()

        if (!isComponentMounted) {
          return
        }

        // Center on resource location
        const center = {
          lat: resource.latitude,
          lng: resource.longitude,
        }
        const zoom = getMapZoom(resource)

        // Create map instance with Map ID for Advanced Markers
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapId: 'e3b80f3f5c95c2958f1264e8', // Map ID for Advanced Markers
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        })

        mapInstanceRef.current = map

        // Create info window (for showing resource info on click)
        infoWindowRef.current = new google.maps.InfoWindow()

        setIsLoading(false)
      } catch (err) {
        console.error('[SingleResourceMap] Error initializing Google Maps:', err)
        if (isComponentMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load map. Please check your internet connection and try again.'
          )
          setIsLoading(false)
        }
      }
    }

    initMap()

    return () => {
      isComponentMounted = false
    }
  }, [resource, isMounted, hasCoordinates])

  // Create marker when map is ready
  useEffect(() => {
    if (!hasCoordinates || !mapInstanceRef.current || isLoading) return

    const map = mapInstanceRef.current

    // Clear existing marker
    if (markerRef.current) {
      markerRef.current.map = null
    }
    if (approximateCircleRef.current) {
      approximateCircleRef.current.setMap(null)
    }

    const position = {
      lat: resource.latitude,
      lng: resource.longitude,
    }

    // Build info window content
    const infoContent = `
      <div style="padding: 12px; min-width: 250px; max-width: 300px;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
          ${resource.name}
        </h3>
        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
          <strong>Category:</strong> ${resource.primary_category}
        </p>
        ${
          approximateLocation
            ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
          <strong>Map:</strong> ${approximateLocation.label}, not a street address
        </p>`
            : ''
        }
        <p style="margin: 0; color: #666; font-size: 14px;">
          ${resource.address}
        </p>
      </div>
    `

    if (approximateLocation) {
      const circle = new google.maps.Circle({
        map,
        center: position,
        radius: approximateLocation.radiusMeters,
        strokeColor: '#1976d2',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: '#64b5f6',
        fillOpacity: 0.2,
        clickable: true,
      })

      approximateCircleRef.current = circle

      circle.addListener('click', () => {
        if (!infoWindowRef.current) return
        infoWindowRef.current.setContent(infoContent)
        infoWindowRef.current.setPosition(position)
        infoWindowRef.current.open({
          map,
        })
      })

      if (showInfo && infoWindowRef.current) {
        infoWindowRef.current.setContent(infoContent)
        infoWindowRef.current.setPosition(position)
        infoWindowRef.current.open({
          map,
        })
      }

      return
    }

    // Create custom marker element with category icon
    const markerElement = createCategoryMarkerElement(
      resource.primary_category as ResourceCategory,
      {
        size: 48, // Slightly larger for detail page
        selected: false,
      }
    )

    // Create Advanced Marker
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title: resource.name,
      content: markerElement,
    })

    markerRef.current = marker

    // Add click listener to show info window
    marker.addListener('click', () => {
      if (!infoWindowRef.current) return
      infoWindowRef.current.setContent(infoContent)
      infoWindowRef.current.open({
        map,
        anchor: marker,
      })
    })

    // Show info window on mount if requested
    if (showInfo && infoWindowRef.current) {
      infoWindowRef.current.setContent(infoContent)
      infoWindowRef.current.open({
        map,
        anchor: marker,
      })
    }
  }, [resource, isLoading, showInfo, hasCoordinates, approximateLocation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.map = null
      }
      if (approximateCircleRef.current) {
        approximateCircleRef.current.setMap(null)
      }
    }
  }, [])

  if (!hasCoordinates) {
    return (
      <Box
        sx={{
          height,
          width: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          p: 2,
        }}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          A precise map pin isn&apos;t available for this resource. Use the contact details below to
          confirm the best location.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', height, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
      {/* Map div - ALWAYS rendered so ref is available */}
      <Box ref={mapRef} sx={{ height: '100%', width: '100%' }} />

      {!isLoading && !error && approximateLocation && (
        <Alert
          severity="info"
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 1,
            bgcolor: 'rgba(255,255,255,0.92)',
          }}
        >
          {approximateLocation.label}, not a street address
        </Alert>
      )}

      {/* Loading overlay - shown on top */}
      {isLoading && !error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Error overlay */}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            p: 2,
            zIndex: 1,
          }}
        >
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Box>
      )}
    </Box>
  )
}

export default SingleResourceMap
