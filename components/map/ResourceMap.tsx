'use client'

import { useEffect, useRef, useState } from 'react'
import { Box, Typography, CircularProgress, Button, Alert } from '@mui/material'
import { MapOutlined, ListAlt } from '@mui/icons-material'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { initializeGoogleMaps } from '@/lib/google-maps'
import { getCategoryLabel } from '@/lib/utils/categories'
import { calculateDistance, formatDistanceSmart } from '@/lib/utils/distance'
import { createCategoryMarkerElement } from '@/lib/utils/map-marker-icon'
import { getResourceUrl } from '@/lib/utils/resource-url'
import type { ResourceCategory } from '@/lib/types/database'
import { env } from '@/lib/env'
import { normalizeViewportBounds, type MapViewportBounds } from '@/lib/utils/map-viewport'
import { shouldAutoFitBounds, shouldPanToUserLocation } from '@/lib/utils/map-framing'
import {
  getApproximateLocationPresentation,
  getResourceServiceArea,
  getServiceAreaHeading,
  getServiceAreaSummary,
} from '@/lib/utils/resource-location'

type ApproximateServiceArea = {
  type?: string | null
  values?: string[] | null
}

type ResourceMapApproximateFields = {
  county?: string | null
  county_fips?: string | null
  addressType?: string | null
  address_type?: string | null
  serviceArea?: ApproximateServiceArea | null
  service_area?: ApproximateServiceArea | null
}

export interface ResourceMapResource extends ResourceMapApproximateFields {
  id: string
  name: string
  primary_category: string
  address: string
  latitude: number | null
  longitude: number | null
  slug: string | null
  city: string | null
  state: string | null
}

interface CountyFeature {
  properties: {
    state_code: string
    county_name: string
  }
  geometry: {
    type: string
    coordinates: unknown[]
  }
}

interface OverlayAction {
  position: { lat: number; lng: number }
  openInfo: () => void
}

let countyFeatureIndexPromise: Promise<Map<string, CountyFeature>> | null = null

interface ResourceMapProps {
  /**
   * Resources to display on map
   */
  resources: ResourceMapResource[]

  /**
   * User's current location (center map here)
   */
  userLocation?: { latitude: number; longitude: number } | null

  /**
   * Radius in miles for location-based filtering
   */
  radiusMiles?: number

  /**
   * Explicit viewport bounds to restore from a sharable URL
   */
  viewportBounds?: MapViewportBounds | null

  /**
   * Selected resource ID (to highlight/open)
   */
  selectedResourceId?: string | null

  /**
   * Callback when resource marker is clicked
   */
  onResourceClick?: (resourceId: string) => void

  /**
   * Callback when the user changes the visible map bounds via pan/zoom
   */
  onViewportBoundsChange?: (bounds: MapViewportBounds) => void

  /**
   * Map height (default: '500px')
   */
  height?: string

  /**
   * Always frame the map to the displayed resources, even when a user location
   * is set. Use on place-scoped browse pages (a city / category-in-city / tag
   * page) so a user located elsewhere doesn't pull the map off the place.
   */
  fitToResources?: boolean
}

function hasValidUserLocation(
  userLocation: ResourceMapProps['userLocation']
): userLocation is { latitude: number; longitude: number } {
  return Boolean(
    userLocation &&
    Number.isFinite(userLocation.latitude) &&
    Number.isFinite(userLocation.longitude)
  )
}

// Default map center (from environment config)
const DEFAULT_CENTER = {
  lat: env.NEXT_PUBLIC_DEFAULT_LATITUDE,
  lng: env.NEXT_PUBLIC_DEFAULT_LONGITUDE,
}
const DEFAULT_ZOOM = 12

function normalizeCountyName(county: string | null | undefined): string {
  return (county || '')
    .trim()
    .toLowerCase()
    .replace(/\b(county|parish|borough|census area|municipality|municipio|city and borough)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCountyKey(
  state: string | null | undefined,
  county: string | null | undefined
): string {
  return `${(state || '').trim().toUpperCase()}::${normalizeCountyName(county)}`
}

async function loadCountyFeatureIndex(): Promise<Map<string, CountyFeature>> {
  if (!countyFeatureIndexPromise) {
    countyFeatureIndexPromise = fetch('/data/us-counties.geojson')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load county GeoJSON')
        }

        const geojson = (await response.json()) as {
          features?: CountyFeature[]
        }
        const index = new Map<string, CountyFeature>()

        for (const feature of geojson.features || []) {
          index.set(
            normalizeCountyKey(feature.properties.state_code, feature.properties.county_name),
            feature
          )
        }

        return index
      })
      .catch((error) => {
        countyFeatureIndexPromise = null
        throw error
      })
  }

  return countyFeatureIndexPromise
}

function geoJsonToPolygonPaths(geometry: CountyFeature['geometry']): google.maps.LatLngLiteral[][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring) =>
      (ring as number[][]).map(([lng, lat]) => ({ lat, lng }))
    )
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon) =>
      (polygon as number[][][]).map((ring) => ring.map(([lng, lat]) => ({ lat, lng })))
    )
  }

  return []
}

function extendBoundsForCircle(
  bounds: google.maps.LatLngBounds,
  center: { lat: number; lng: number },
  radiusMeters: number
) {
  const latDelta = radiusMeters / 111320
  const lngDelta = radiusMeters / (111320 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.1))

  bounds.extend({ lat: center.lat + latDelta, lng: center.lng + lngDelta })
  bounds.extend({ lat: center.lat - latDelta, lng: center.lng - lngDelta })
}

function extendBoundsForGeometry(
  bounds: google.maps.LatLngBounds,
  geometry: CountyFeature['geometry']
) {
  const walk = (value: unknown) => {
    if (!Array.isArray(value)) return
    if (value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      bounds.extend({ lat: value[1], lng: value[0] })
      return
    }
    value.forEach(walk)
  }

  walk(geometry.coordinates)
}

function buildInfoContent(
  resource: ResourceMapResource,
  distance: number | null,
  approximateLabel?: string | null
) {
  const categoryLabel = getCategoryLabel(
    resource.primary_category as Parameters<typeof getCategoryLabel>[0]
  )
  const distanceText =
    distance !== null ? `<strong>${formatDistanceSmart(distance)}</strong> away` : ''
  const resourceUrl = getResourceUrl(resource)
  const serviceAreaHeading = getServiceAreaHeading(resource)
  const serviceAreaSummary = getServiceAreaSummary(resource)
  const isApproximate = Boolean(approximateLabel)
  const addressBlock =
    !isApproximate && resource.address
      ? `<p style="margin: 4px 0; color: #666; font-size: 14px;">${resource.address}</p>`
      : ''
  const serviceAreaBlock = serviceAreaHeading
    ? `<p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>${serviceAreaHeading}</strong></p>`
    : ''
  const serviceAreaSummaryBlock = serviceAreaSummary
    ? `<p style="margin: 4px 0; color: #666; font-size: 14px;">${serviceAreaSummary}</p>`
    : ''
  const approximateBlock = approximateLabel
    ? `<p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Map:</strong> ${approximateLabel}, not a street address</p>`
    : ''

  return `
    <div style="padding: 8px; min-width: 200px; max-width: 320px;">
      <a
        href="${resourceUrl}"
        style="text-decoration: none; color: inherit;"
      >
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: inherit;">
          ${resource.name}
        </h3>
      </a>
      <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">
        <strong>Category:</strong> ${categoryLabel}
      </p>
      ${serviceAreaBlock}
      ${serviceAreaSummaryBlock}
      ${approximateBlock}
      ${addressBlock}
      ${
        distanceText
          ? `<p style="margin: 4px 0; color: #666; font-size: 14px;">
          ${distanceText}
        </p>`
          : ''
      }
      <a
        href="${resourceUrl}"
        style="display: inline-block; margin-top: 8px; color: #1976d2; text-decoration: none; font-weight: 500;"
        onclick="event.stopPropagation();"
      >
        View Details →
      </a>
    </div>
  `
}

/**
 * ResourceMap component
 * Displays resources on an interactive Google Map with markers, clustering, and info windows
 */
export function ResourceMap({
  resources,
  userLocation,
  radiusMiles,
  viewportBounds,
  selectedResourceId,
  onResourceClick,
  onViewportBoundsChange,
  height = '500px',
  fitToResources = false,
}: ResourceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const approximateCirclesRef = useRef<google.maps.Circle[]>([])
  const approximatePolygonsRef = useRef<google.maps.Polygon[]>([])
  const overlayActionsRef = useRef<Map<string, OverlayAction>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const radiusCircleRef = useRef<google.maps.Circle | null>(null)
  const pendingViewportSyncRef = useRef(false)
  const suppressViewportSyncRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Type for map instance with cleanup function
  interface MapWithCleanup extends google.maps.Map {
    __cleanup?: () => void
  }
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

        // Determine map center
        const center = hasValidUserLocation(userLocation)
          ? { lat: userLocation.latitude, lng: userLocation.longitude }
          : DEFAULT_CENTER

        // Create map instance with Map ID for Advanced Markers
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: DEFAULT_ZOOM,
          mapId: 'e3b80f3f5c95c2958f1264e8', // Map ID for Advanced Markers
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        })

        mapInstanceRef.current = map

        // Create info window (reused for all markers)
        infoWindowRef.current = new google.maps.InfoWindow()

        // Add ESC key listener to close info window
        const handleEscKey = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && infoWindowRef.current) {
            infoWindowRef.current.close()
          }
        }
        document.addEventListener('keydown', handleEscKey)

        // Add map click listener to close info window when clicking outside
        const mapClickListener = map.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.close()
          }
        })

        const dragStartListener = map.addListener('dragstart', () => {
          pendingViewportSyncRef.current = true
        })

        const zoomChangedListener = map.addListener('zoom_changed', () => {
          if (suppressViewportSyncRef.current) return
          pendingViewportSyncRef.current = true
        })

        const idleListener = map.addListener('idle', () => {
          if (suppressViewportSyncRef.current) {
            suppressViewportSyncRef.current = false
            pendingViewportSyncRef.current = false
            return
          }

          if (!pendingViewportSyncRef.current || !onViewportBoundsChange) return

          const bounds = map.getBounds()
          if (!bounds) return

          const northEast = bounds.getNorthEast()
          const southWest = bounds.getSouthWest()

          pendingViewportSyncRef.current = false
          onViewportBoundsChange(
            normalizeViewportBounds({
              north: northEast.lat(),
              south: southWest.lat(),
              east: northEast.lng(),
              west: southWest.lng(),
            })
          )
        })

        // Store cleanup functions
        const cleanup = () => {
          document.removeEventListener('keydown', handleEscKey)
          if (mapClickListener) {
            google.maps.event.removeListener(mapClickListener)
          }
          if (dragStartListener) {
            google.maps.event.removeListener(dragStartListener)
          }
          if (zoomChangedListener) {
            google.maps.event.removeListener(zoomChangedListener)
          }
          if (idleListener) {
            google.maps.event.removeListener(idleListener)
          }
        }

        // Store cleanup for later
        ;(mapInstanceRef.current as MapWithCleanup).__cleanup = cleanup

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
      // Call stored cleanup function for event listeners
      const cleanup = (mapInstanceRef.current as MapWithCleanup)?.__cleanup
      if (cleanup) {
        cleanup()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, onViewportBoundsChange]) // Only initialize once on mount - userLocation handled separately below

  // Re-center map when userLocation changes (separate effect for efficiency).
  // Skipped on place-scoped pages (fitToResources) so the city stays framed.
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !shouldPanToUserLocation({
        hasUserLocation: hasValidUserLocation(userLocation),
        fitToResources,
      })
    )
      return

    const newCenter = { lat: userLocation!.latitude, lng: userLocation!.longitude }

    // Smooth pan to new location with animation
    mapInstanceRef.current.panTo(newCenter)
  }, [userLocation, fitToResources])

  // Restore an explicit sharable viewport when present
  useEffect(() => {
    if (!mapInstanceRef.current || !viewportBounds) return

    suppressViewportSyncRef.current = true
    mapInstanceRef.current.fitBounds(viewportBounds, {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50,
    })
  }, [viewportBounds])

  // Create markers when resources or map changes
  useEffect(() => {
    if (!mapInstanceRef.current || isLoading || resources.length === 0) {
      return
    }

    let cancelled = false

    const clearOverlays = () => {
      markersRef.current.forEach((marker) => {
        marker.map = null
      })
      markersRef.current = []

      approximateCirclesRef.current.forEach((circle) => {
        circle.setMap(null)
      })
      approximateCirclesRef.current = []

      approximatePolygonsRef.current.forEach((polygon) => {
        polygon.setMap(null)
      })
      approximatePolygonsRef.current = []

      overlayActionsRef.current = new Map()

      if (clustererRef.current) {
        clustererRef.current.clearMarkers()
      }
    }

    clearOverlays()

    void (async () => {
      const map = mapInstanceRef.current
      if (!map) return

      const exactMarkers: google.maps.marker.AdvancedMarkerElement[] = []
      const approximateCircles: google.maps.Circle[] = []
      const approximatePolygons: google.maps.Polygon[] = []
      const overlayActions = new Map<string, OverlayAction>()
      const bounds = new google.maps.LatLngBounds()
      const needsCountyFeatures = resources.some((resource) => {
        const serviceAreaType = (
          resource.serviceArea?.type ||
          resource.service_area?.type ||
          ''
        ).toLowerCase()
        return serviceAreaType === 'county'
      })
      const countyFeatures = needsCountyFeatures ? await loadCountyFeatureIndex() : null

      if (cancelled) return

      const openInfoWindow = (
        position: { lat: number; lng: number },
        content: string,
        anchor?: google.maps.marker.AdvancedMarkerElement
      ) => {
        if (!infoWindowRef.current) return
        infoWindowRef.current.setContent(content)
        if (anchor) {
          infoWindowRef.current.open({ map, anchor })
        } else {
          infoWindowRef.current.setPosition(position)
          infoWindowRef.current.open({ map })
        }
      }

      resources.forEach((resource) => {
        if (
          resource.latitude == null ||
          resource.longitude == null ||
          typeof resource.latitude !== 'number' ||
          typeof resource.longitude !== 'number' ||
          typeof resource.longitude !== 'number' ||
          isNaN(resource.latitude) ||
          isNaN(resource.longitude)
        ) {
          return
        }

        const position = {
          lat: resource.latitude,
          lng: resource.longitude,
        }
        const approximateLocation = getApproximateLocationPresentation(resource)
        let distance: number | null = null
        if (hasValidUserLocation(userLocation)) {
          distance = calculateDistance(
            { latitude: resource.latitude, longitude: resource.longitude },
            userLocation
          )
          if (!Number.isFinite(distance)) distance = null
        }

        const openResourceInfo = (anchor?: google.maps.marker.AdvancedMarkerElement) => {
          openInfoWindow(
            position,
            buildInfoContent(resource, distance, approximateLocation?.label || null),
            anchor
          )
          if (onResourceClick) {
            onResourceClick(resource.id)
          }
        }

        if (approximateLocation) {
          const normalizedServiceArea = getResourceServiceArea(resource)
          const countyNames = normalizedServiceArea?.values?.length
            ? normalizedServiceArea.values
            : resource.county
              ? [resource.county]
              : []
          const serviceAreaType = (normalizedServiceArea?.type || '').toLowerCase()

          if (serviceAreaType === 'county' && countyFeatures && countyNames.length > 0) {
            const matchingFeatures = countyNames
              .map((countyName) =>
                countyFeatures.get(normalizeCountyKey(resource.state, countyName))
              )
              .filter(Boolean) as CountyFeature[]

            if (matchingFeatures.length > 0) {
              matchingFeatures.forEach((countyFeature) => {
                const polygon = new google.maps.Polygon({
                  map,
                  paths: geoJsonToPolygonPaths(countyFeature.geometry),
                  strokeColor: '#1976d2',
                  strokeOpacity: 0.9,
                  strokeWeight: 2,
                  fillColor: '#64b5f6',
                  fillOpacity: 0.18,
                  clickable: true,
                })

                polygon.addListener('click', () => openResourceInfo())
                approximatePolygons.push(polygon)
                extendBoundsForGeometry(bounds, countyFeature.geometry)
              })

              overlayActions.set(resource.id, {
                position,
                openInfo: () => openResourceInfo(),
              })
              return
            }
          }

          const circle = new google.maps.Circle({
            map,
            center: position,
            radius: approximateLocation.radiusMeters,
            strokeColor: '#1976d2',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#64b5f6',
            fillOpacity: 0.18,
            clickable: true,
          })

          circle.addListener('click', () => openResourceInfo())
          approximateCircles.push(circle)
          overlayActions.set(resource.id, {
            position,
            openInfo: () => openResourceInfo(),
          })
          extendBoundsForCircle(bounds, position, approximateLocation.radiusMeters)
          return
        }

        const markerElement = createCategoryMarkerElement(
          resource.primary_category as ResourceCategory,
          {
            size: 40,
            selected: selectedResourceId === resource.id,
          }
        )

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          title: resource.name,
          content: markerElement,
        })

        marker.addListener('click', () => openResourceInfo(marker))
        exactMarkers.push(marker)
        overlayActions.set(resource.id, {
          position,
          openInfo: () => openResourceInfo(marker),
        })
        bounds.extend(position)
      })

      if (cancelled) {
        exactMarkers.forEach((marker) => {
          marker.map = null
        })
        approximateCircles.forEach((circle) => {
          circle.setMap(null)
        })
        approximatePolygons.forEach((polygon) => {
          polygon.setMap(null)
        })
        return
      }

      markersRef.current = exactMarkers
      approximateCirclesRef.current = approximateCircles
      approximatePolygonsRef.current = approximatePolygons
      overlayActionsRef.current = overlayActions

      if (exactMarkers.length >= 10) {
        clustererRef.current = new MarkerClusterer({
          map,
          markers: exactMarkers,
        })
      }

      const renderableCount =
        exactMarkers.length + approximateCircles.length + approximatePolygons.length

      if (
        renderableCount > 0 &&
        shouldAutoFitBounds({
          hasUserLocation: hasValidUserLocation(userLocation),
          hasViewportBounds: Boolean(viewportBounds),
          fitToResources,
        })
      ) {
        suppressViewportSyncRef.current = true
        map.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        })

        const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          const zoom = map.getZoom()
          if (zoom && zoom > 15) {
            suppressViewportSyncRef.current = true
            map.setZoom(15)
          }
        })

        return () => {
          google.maps.event.removeListener(listener)
        }
      }
    })()

    return () => {
      cancelled = true
      clearOverlays()
    }
  }, [
    resources,
    userLocation,
    viewportBounds,
    selectedResourceId,
    isLoading,
    onResourceClick,
    fitToResources,
  ])

  // Create user location marker (blue dot)
  useEffect(() => {
    if (!mapInstanceRef.current || !hasValidUserLocation(userLocation)) {
      // Remove marker if no location
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.map = null
        userLocationMarkerRef.current = null
      }
      return
    }

    const map = mapInstanceRef.current

    // Create blue circle marker for user location
    const userMarkerElement = document.createElement('div')
    userMarkerElement.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        background-color: #4285F4;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    `

    // Remove existing marker if any
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.map = null
    }

    // Create new marker
    userLocationMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      content: userMarkerElement,
      title: 'Your Location',
      zIndex: 1000, // Always on top of resource markers
    })
  }, [userLocation])

  // Draw radius circle around user location
  useEffect(() => {
    if (!mapInstanceRef.current || !hasValidUserLocation(userLocation) || !radiusMiles) {
      // Remove circle if no location or radius
      if (radiusCircleRef.current) {
        radiusCircleRef.current.setMap(null)
        radiusCircleRef.current = null
      }
      return
    }

    const map = mapInstanceRef.current

    // Convert miles to meters (1 mile = 1609.34 meters)
    const radiusMeters = radiusMiles * 1609.34

    // Remove existing circle if any
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null)
    }

    // Create new circle
    radiusCircleRef.current = new google.maps.Circle({
      map,
      center: { lat: userLocation.latitude, lng: userLocation.longitude },
      radius: radiusMeters,
      strokeColor: '#1976d2',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#1976d2',
      fillOpacity: 0.15,
      clickable: false,
    })
  }, [userLocation, radiusMiles])

  // Open info window for selected resource
  useEffect(() => {
    if (!selectedResourceId || !mapInstanceRef.current || !infoWindowRef.current) return

    const overlayAction = overlayActionsRef.current.get(selectedResourceId)
    if (!overlayAction) return

    overlayAction.openInfo()
    mapInstanceRef.current.panTo(overlayAction.position)
  }, [selectedResourceId, resources])

  // Adjust zoom based on radius changes (smooth zoom)
  useEffect(() => {
    if (!mapInstanceRef.current || !hasValidUserLocation(userLocation) || !radiusMiles) return

    const map = mapInstanceRef.current

    // Calculate appropriate zoom level based on radius
    // Zoom levels: 1 mile ≈ zoom 14, 5 miles ≈ zoom 12, 10 miles ≈ zoom 11, 25 miles ≈ zoom 10, 50 miles ≈ zoom 9
    let targetZoom: number
    if (radiusMiles <= 2) {
      targetZoom = 14
    } else if (radiusMiles <= 5) {
      targetZoom = 12
    } else if (radiusMiles <= 10) {
      targetZoom = 11
    } else if (radiusMiles <= 25) {
      targetZoom = 10
    } else {
      targetZoom = 9
    }

    // Smoothly animate to the new zoom level
    const currentZoom = map.getZoom() || DEFAULT_ZOOM
    if (currentZoom !== targetZoom) {
      suppressViewportSyncRef.current = true
      map.setZoom(targetZoom)
    }
  }, [radiusMiles, userLocation])

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

      // Clean up radius circle
      if (radiusCircleRef.current) {
        radiusCircleRef.current.setMap(null)
      }
      approximateCirclesRef.current.forEach((circle) => {
        circle.setMap(null)
      })
      approximatePolygonsRef.current.forEach((polygon) => {
        polygon.setMap(null)
      })
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
