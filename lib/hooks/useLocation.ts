'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Coordinates } from '@/lib/utils/distance'

export interface UseLocationResult {
  coordinates: Coordinates | null
  error: GeolocationError | null
  loading: boolean
  requestLocation: () => void
  clearLocation: () => void
  isSupported: boolean
}

export type GeolocationError =
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout'
  | 'not-supported'
  | 'unknown'

/**
 * Custom hook for accessing browser geolocation
 *
 * @param autoRequest - Whether to automatically request location on mount
 * @returns Location state and control functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { coordinates, error, loading, requestLocation } = useLocation()
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

  // Check if geolocation is supported by the browser
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  /**
   * Handle successful geolocation
   */
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setCoordinates({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    })
    setError(null)
    setLoading(false)
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
      enableHighAccuracy: false, // Use false for faster, battery-friendly results
      timeout: 10000, // 10 second timeout
      maximumAge: 300000, // Cache location for 5 minutes
    })
  }, [isSupported, handleSuccess, handleError])

  /**
   * Clear current location and error state
   */
  const clearLocation = useCallback(() => {
    setCoordinates(null)
    setError(null)
    setLoading(false)
  }, [])

  /**
   * Auto-request location on mount if autoRequest is true
   */
  useEffect(() => {
    if (autoRequest && isSupported) {
      requestLocation()
    }
  }, [autoRequest, isSupported, requestLocation])

  return {
    coordinates,
    error,
    loading,
    requestLocation,
    clearLocation,
    isSupported,
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
