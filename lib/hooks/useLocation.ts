'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Coordinates } from '@/lib/utils/distance'

export interface UseLocationResult {
  coordinates: Coordinates | null
  error: GeolocationError | null
  loading: boolean
  requestLocation: () => void
  setManualLocation: (coords: Coordinates, displayName: string) => void
  clearLocation: () => void
  isSupported: boolean
  lastUpdated: number | null // Unix timestamp of last location update
  displayName: string | null // "Current Location", "Oakland, CA", "94601", etc.
  source: 'geolocation' | 'manual' | 'geoip' | null // How we got the location
}

interface CachedLocation {
  coordinates: Coordinates
  timestamp: number
  displayName: string
  source: 'geolocation' | 'manual' | 'geoip'
}

interface GeoIPResponse {
  location: {
    latitude: number
    longitude: number
    city?: string
    region?: string
    country?: string
    timezone?: string
  } | null
  message?: string
  ip?: string
}

const LOCATION_CACHE_KEY = 'userLocation'
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
const REFRESH_INTERVAL = 2 * 60 * 1000 // Check every 2 minutes

export type GeolocationError =
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout'
  | 'not-supported'
  | 'unknown'

/**
 * Load cached location from localStorage
 */
function loadFromCache(): CachedLocation | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY)
    if (!cached) return null

    const parsed = JSON.parse(cached) as CachedLocation
    const age = Date.now() - parsed.timestamp

    // Return cached location if it's still fresh
    if (age < CACHE_DURATION) {
      return parsed
    }

    // Cache expired, remove it
    localStorage.removeItem(LOCATION_CACHE_KEY)
    return null
  } catch {
    return null
  }
}

/**
 * Save location to localStorage cache
 */
function saveToCache(
  coordinates: Coordinates,
  displayName: string,
  source: 'geolocation' | 'manual' | 'geoip'
): void {
  if (typeof window === 'undefined') return

  try {
    const cached: CachedLocation = {
      coordinates,
      timestamp: Date.now(),
      displayName,
      source,
    }
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cached))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Custom hook for accessing browser geolocation with caching and periodic refresh
 *
 * @param autoRequest - Whether to automatically request location on mount
 * @returns Location state and control functions
 *
 * Features:
 * - Caches location in localStorage for 7 days
 * - Auto-loads cached location on mount
 * - Periodic refresh every 2 minutes if location was previously granted
 * - Provides lastUpdated timestamp
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { coordinates, error, loading, requestLocation, lastUpdated } = useLocation()
 *
 *   if (loading) return <p>Getting location...</p>
 *   if (error) return <p>Error: {error}</p>
 *   if (!coordinates) return <button onClick={requestLocation}>Get My Location</button>
 *
 *   return <p>Lat: {coordinates.latitude}, Lng: {coordinates.longitude}</p>
 * }
 * ```
 */
export function useLocation(autoRequest: boolean = false): UseLocationResult {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [error, setError] = useState<GeolocationError | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [source, setSource] = useState<'geolocation' | 'manual' | 'geoip' | null>(null)

  // Check if geolocation is supported by the browser
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  /**
   * Handle successful geolocation
   */
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
    setCoordinates(coords)
    setDisplayName('Current Location')
    setSource('geolocation')
    setError(null)
    setLoading(false)
    setLastUpdated(Date.now())

    // Cache the location
    saveToCache(coords, 'Current Location', 'geolocation')
  }, [])

  /**
   * Handle geolocation errors
   */
  const handleError = useCallback((err: GeolocationPositionError) => {
    setLoading(false)
    setCoordinates(null)

    // Map GeolocationPositionError codes to our error types
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('permission-denied')
        break
      case err.POSITION_UNAVAILABLE:
        setError('position-unavailable')
        break
      case err.TIMEOUT:
        setError('timeout')
        break
      default:
        setError('unknown')
    }
  }, [])

  /**
   * Request user's current location
   */
  const requestLocation = useCallback(() => {
    if (!isSupported) {
      setError('not-supported')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      // enableHighAccuracy: false uses cell tower + WiFi triangulation instead of GPS
      // This is intentional for our use case:
      // - Faster results (1-3 seconds vs 10-30 seconds for GPS)
      // - Lower battery drain on mobile devices
      // - Sufficient accuracy (50-200m in urban areas) for "find resources near me"
      // - Users are looking for services within miles, not precise turn-by-turn navigation
      // Trade-off: Less accurate than GPS (5-10m) but better UX for resource discovery
      enableHighAccuracy: false,
      timeout: 10000, // 10 second timeout
      maximumAge: 300000, // Cache location for 5 minutes
    })
  }, [isSupported, handleSuccess, handleError])

  /**
   * Set manual location (from address/zip lookup)
   */
  const setManualLocation = useCallback((coords: Coordinates, name: string) => {
    setCoordinates(coords)
    setDisplayName(name)
    setSource('manual')
    setError(null)
    setLoading(false)
    setLastUpdated(Date.now())

    // Cache the manual location
    saveToCache(coords, name, 'manual')
  }, [])

  /**
   * Clear current location and error state
   */
  const clearLocation = useCallback(() => {
    setCoordinates(null)
    setDisplayName(null)
    setSource(null)
    setError(null)
    setLoading(false)
    setLastUpdated(null)

    // Clear cache
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCATION_CACHE_KEY)
    }
  }, [])

  /**
   * Load cached location on mount
   */
  useEffect(() => {
    const cached = loadFromCache()
    if (cached) {
      setCoordinates(cached.coordinates)
      setDisplayName(cached.displayName)
      setSource(cached.source)
      setLastUpdated(cached.timestamp)
    }
  }, [])

  /**
   * Fetch GeoIP-based location on mount if no cached location
   * This runs after cache check, providing a default location without permission
   */
  useEffect(() => {
    // Skip if we already have a location (from cache or manual input)
    if (coordinates) return

    // Skip if we're already loading geolocation
    if (loading) return

    const fetchGeoIPLocation = async () => {
      try {
        const response = await fetch('/api/location/ip')
        const data = (await response.json()) as GeoIPResponse

        if (data.location && data.location.latitude && data.location.longitude) {
          const { latitude, longitude, city, region } = data.location

          // Format display name from GeoIP data
          let displayName = ''
          if (city && region) {
            displayName = `${city}, ${region}`
          } else if (city) {
            displayName = city
          } else if (region) {
            displayName = region
          } else {
            displayName = 'Approximate Location'
          }

          const coords = { latitude, longitude }

          // Set GeoIP location (lower priority than geolocation/manual)
          setCoordinates(coords)
          setDisplayName(displayName)
          setSource('geoip')
          setLastUpdated(Date.now())

          // Cache the GeoIP location
          saveToCache(coords, displayName, 'geoip')
        }
      } catch (error) {
        // Silently fail - GeoIP is optional, user can still use manual location
        console.debug('GeoIP location fetch failed:', error)
      }
    }

    fetchGeoIPLocation()
  }, [coordinates, loading])

  /**
   * Auto-request location on mount if autoRequest is true
   */
  useEffect(() => {
    if (autoRequest && isSupported) {
      requestLocation()
    }
  }, [autoRequest, isSupported, requestLocation])

  /**
   * Set up periodic refresh if we have coordinates
   */
  useEffect(() => {
    if (!coordinates || !isSupported) return

    const intervalId = setInterval(() => {
      // Silently refresh location in background
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        () => {
          // Ignore errors on background refresh, keep using cached location
        },
        {
          enableHighAccuracy: false, // Same settings as initial request - see comment above
          timeout: 10000,
          maximumAge: 300000,
        }
      )
    }, REFRESH_INTERVAL)

    return () => clearInterval(intervalId)
  }, [coordinates, isSupported, handleSuccess])

  return {
    coordinates,
    error,
    loading,
    requestLocation,
    setManualLocation,
    clearLocation,
    isSupported,
    lastUpdated,
    displayName,
    source,
  }
}

/**
 * Get user-friendly error message for geolocation errors
 */
export function getLocationErrorMessage(error: GeolocationError): string {
  switch (error) {
    case 'permission-denied':
      return 'Location access was denied. Please enable location permissions in your browser settings.'
    case 'position-unavailable':
      return 'Your location is currently unavailable. Please try again.'
    case 'timeout':
      return 'Location request timed out. Please try again.'
    case 'not-supported':
      return 'Geolocation is not supported by your browser.'
    case 'unknown':
    default:
      return 'An unknown error occurred while getting your location.'
  }
}
