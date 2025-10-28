'use client'

import { useEffect, useRef, useState } from 'react'
import { Box, CircularProgress, Alert } from '@mui/material'
import type { Resource } from '@/lib/types/database'
import { initializeGoogleMaps } from '@/lib/google-maps'
import { getCategoryColor } from '@/lib/utils/category-icons'

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
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
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
    if (!isMounted) return // Wait for client-side hydration

    let isComponentMounted = true

    async function initMap() {
      if (!mapRef.current) {
        console.log('[SingleResourceMap] mapRef.current is null, skipping init')
        return
      }

      try {
        console.log('[SingleResourceMap] Starting map initialization...')
        setIsLoading(true)
        setError(null)

        // Load Google Maps libraries
        await initializeGoogleMaps()

        if (!isComponentMounted) {
          console.log('[SingleResourceMap] Component unmounted during init, aborting')
          return
        }

        // Center on resource location
        const center = {
          lat: resource.latitude,
          lng: resource.longitude,
        }

        // Create map instance with Map ID for Advanced Markers
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: DEFAULT_ZOOM,
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
  }, [resource, isMounted])

  // Create marker when map is ready
  useEffect(() => {
    if (!mapInstanceRef.current || isLoading) return

    const map = mapInstanceRef.current

    // Clear existing marker
    if (markerRef.current) {
      markerRef.current.map = null
    }

    // Get category color
    const categoryColor = getCategoryColor(
      resource.primary_category as Parameters<typeof getCategoryColor>[0]
    )

    // Create custom pin element for Advanced Marker
    const pinElement = new google.maps.marker.PinElement({
      scale: 1.3,
      background: categoryColor,
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
    })

    // Create Advanced Marker
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: {
        lat: resource.latitude,
        lng: resource.longitude,
      },
      title: resource.name,
      content: pinElement.element,
    })

    markerRef.current = marker

    // Build info window content
    const infoContent = `
      <div style="padding: 12px; min-width: 250px; max-width: 300px;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
          ${resource.name}
        </h3>
        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
          <strong>Category:</strong> ${resource.primary_category}
        </p>
        <p style="margin: 0; color: #666; font-size: 14px;">
          ${resource.address}
        </p>
      </div>
    `

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
  }, [resource, isLoading, showInfo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.map = null
      }
    }
  }, [])

  return (
    <Box sx={{ position: 'relative', height, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
      {/* Map div - ALWAYS rendered so ref is available */}
      <Box ref={mapRef} sx={{ height: '100%', width: '100%' }} />

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
