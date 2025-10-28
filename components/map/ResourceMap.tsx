'use client'

import { useEffect, useRef, useState } from 'react'
import { Box, Typography, CircularProgress, Button, Alert } from '@mui/material'
import { MapOutlined, ListAlt } from '@mui/icons-material'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import type { Resource } from '@/lib/types/database'
import { initializeGoogleMaps } from '@/lib/google-maps'
import { getCategoryLabel } from '@/lib/utils/categories'
import { getCategoryColor } from '@/lib/utils/category-icons'
import { calculateDistance, formatDistanceSmart } from '@/lib/utils/distance'
import { createCategoryMarkerElement } from '@/lib/utils/map-marker-icon'
import { getResourceUrl } from '@/lib/utils/resource-url'
import type { ResourceCategory } from '@/lib/types/database'

interface ResourceMapProps {
  /**
   * Resources to display on map
   */
  resources: Resource[]

  /**
   * User's current location (center map here)
   */
  userLocation?: { latitude: number; longitude: number } | null

  /**
   * Radius in miles for location-based filtering
   */
  radiusMiles?: number

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

// Default map center (Oakland, CA)
const DEFAULT_CENTER = { lat: 37.8044, lng: -122.2712 }
const DEFAULT_ZOOM = 12

/**
 * ResourceMap component
 * Displays resources on an interactive Google Map with markers, clustering, and info windows
 */
export function ResourceMap({
  resources,
  userLocation,
  selectedResourceId,
  onResourceClick,
  height = '500px',
}: ResourceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const clustererRef = useRef<MarkerClusterer | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Wait for client-side hydration to complete
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize map
  useEffect(() => {
    if (!isMounted) return // Wait for client-side hydration

    let isComponentMounted = true

    async function initMap() {
      if (!mapRef.current) {
        console.log('[ResourceMap] mapRef.current is null, skipping init')
        return
      }

      try {
        console.log('[ResourceMap] Starting map initialization...')
        setIsLoading(true)
        setError(null)

        // Load Google Maps libraries
        console.log('[ResourceMap] Loading Google Maps libraries...')
        await initializeGoogleMaps()
        console.log('[ResourceMap] Google Maps libraries loaded successfully')

        if (!isComponentMounted) {
          console.log('[ResourceMap] Component unmounted during init, aborting')
          return
        }

        // Determine map center
        const center = userLocation
          ? { lat: userLocation.latitude, lng: userLocation.longitude }
          : DEFAULT_CENTER
        console.log('[ResourceMap] Map center:', center)

        // Create map instance with Map ID for Advanced Markers
        console.log('[ResourceMap] Creating map instance...')
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: DEFAULT_ZOOM,
          mapId: 'e3b80f3f5c95c2958f1264e8', // Map ID for Advanced Markers
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        })
        console.log('[ResourceMap] Map instance created successfully')

        mapInstanceRef.current = map

        // Create info window (reused for all markers)
        infoWindowRef.current = new google.maps.InfoWindow()

        console.log('[ResourceMap] Map initialization complete, setting isLoading=false')
        setIsLoading(false)
      } catch (err) {
        console.error('[ResourceMap] Error initializing Google Maps:', err)
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
  }, [userLocation, isMounted])

  // Create markers when resources or map changes
  useEffect(() => {
    console.log('[ResourceMap] Marker creation effect triggered', {
      hasMap: !!mapInstanceRef.current,
      isLoading,
      resourceCount: resources.length,
    })

    if (!mapInstanceRef.current || isLoading || resources.length === 0) {
      console.log('[ResourceMap] Skipping marker creation:', {
        noMap: !mapInstanceRef.current,
        stillLoading: isLoading,
        noResources: resources.length === 0,
      })
      return
    }

    console.log(`[ResourceMap] Creating markers for ${resources.length} resources`)

    // Clear existing markers and clusterer
    markersRef.current.forEach((marker) => {
      marker.map = null
    })
    markersRef.current = []

    if (clustererRef.current) {
      clustererRef.current.clearMarkers()
    }

    const map = mapInstanceRef.current
    const markers: google.maps.marker.AdvancedMarkerElement[] = []
    const bounds = new google.maps.LatLngBounds()

    // Create markers for each resource
    resources.forEach((resource) => {
      const position = {
        lat: resource.latitude,
        lng: resource.longitude,
      }

      // Calculate distance if user location is available
      let distance: number | null = null
      if (userLocation) {
        distance = calculateDistance(
          { latitude: resource.latitude, longitude: resource.longitude },
          userLocation
        )
      }

      // Create custom marker element with category icon
      const markerElement = createCategoryMarkerElement(
        resource.primary_category as ResourceCategory,
        {
          size: 40,
          selected: selectedResourceId === resource.id,
        }
      )

      // Create Advanced Marker
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: resource.name,
        content: markerElement,
      })

      // Add click listener to show info window
      marker.addListener('click', () => {
        if (!infoWindowRef.current) return

        // Build info window content
        const categoryLabel = getCategoryLabel(
          resource.primary_category as Parameters<typeof getCategoryLabel>[0]
        )
        const categoryColor = getCategoryColor(
          resource.primary_category as Parameters<typeof getCategoryColor>[0]
        )
        const distanceText =
          distance !== null ? `<strong>${formatDistanceSmart(distance)}</strong> away` : ''
        const resourceUrl = getResourceUrl(resource)

        const content = `
          <div style="padding: 8px; min-width: 200px; max-width: 300px;">
            <a
              href="${resourceUrl}"
              style="text-decoration: none; color: inherit;"
              onmouseover="this.style.color='${categoryColor}'"
              onmouseout="this.style.color='inherit'"
            >
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: inherit;">
                ${resource.name}
              </h3>
            </a>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">
              <strong>Category:</strong> ${categoryLabel}
            </p>
            <p style="margin: 4px 0; color: #666; font-size: 14px;">
              ${resource.address}
            </p>
            ${
              distanceText
                ? `<p style="margin: 4px 0; color: ${categoryColor}; font-size: 14px;">
                ${distanceText}
              </p>`
                : ''
            }
            <a
              href="${resourceUrl}"
              style="display: inline-block; margin-top: 8px; color: ${categoryColor}; text-decoration: none; font-weight: 500;"
              onclick="event.stopPropagation();"
            >
              View Details →
            </a>
          </div>
        `

        infoWindowRef.current.setContent(content)
        infoWindowRef.current.open({
          map,
          anchor: marker,
        })

        // Call onResourceClick callback
        if (onResourceClick) {
          onResourceClick(resource.id)
        }
      })

      markers.push(marker)
      bounds.extend(position)
    })

    markersRef.current = markers

    // Add marker clustering for 10+ markers
    if (markers.length >= 10) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
      })
    }

    // Fit map bounds to show all markers
    if (markers.length > 0) {
      map.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      })

      // Don't zoom in too much for single markers
      const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        const zoom = map.getZoom()
        if (zoom && zoom > 15) {
          map.setZoom(15)
        }
      })

      return () => {
        google.maps.event.removeListener(listener)
      }
    }
  }, [resources, userLocation, selectedResourceId, isLoading, onResourceClick])

  // Open info window for selected resource
  useEffect(() => {
    if (!selectedResourceId || !mapInstanceRef.current || !infoWindowRef.current) return

    const marker = markersRef.current.find((m) => {
      const resource = resources.find((r) => r.id === selectedResourceId)
      const markerPos = m.position as google.maps.LatLng | google.maps.LatLngLiteral
      return (
        resource &&
        markerPos &&
        ((markerPos as google.maps.LatLng).lat?.() === resource.latitude ||
          (markerPos as google.maps.LatLngLiteral).lat === resource.latitude) &&
        ((markerPos as google.maps.LatLng).lng?.() === resource.longitude ||
          (markerPos as google.maps.LatLngLiteral).lng === resource.longitude)
      )
    })

    if (marker) {
      // Trigger click event to open info window
      google.maps.event.trigger(marker, 'click')

      // Center map on selected marker
      const position = marker.position
      if (position) {
        mapInstanceRef.current.panTo(position)
      }
    }
  }, [selectedResourceId, resources])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up markers
      markersRef.current.forEach((marker) => {
        marker.map = null
      })

      // Clean up clusterer
      if (clustererRef.current) {
        clustererRef.current.clearMarkers()
      }

      // Clean up info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
    }
  }, [])

  // Map container - always rendered so ref is available
  return (
    <Box sx={{ position: 'relative', height, width: '100%' }}>
      {/* Map div - always rendered */}
      <Box
        ref={mapRef}
        sx={{
          height: '100%',
          width: '100%',
          borderRadius: 1,
          overflow: 'hidden',
          '& .gm-style-iw-chr': {
            display: 'none', // Hide close button
          },
        }}
      />

      {/* Loading overlay */}
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
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Loading map...
            </Typography>
          </Box>
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
            borderRadius: 1,
            p: 3,
          }}
        >
          <Box sx={{ maxWidth: 400, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                {error}
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You can still browse resources in list view.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ListAlt />}
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </Box>
        </Box>
      )}

      {/* Empty state overlay */}
      {!isLoading && !error && resources.length === 0 && (
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
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <MapOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              No resources to display on map
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}
