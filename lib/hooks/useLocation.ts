'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Coordinates } from '@/lib/utils/distance'

type LocationSource = 'geolocation' | 'manual' | 'geoip'
export type GeolocationError =
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout'
  | 'not-supported'
  | 'unknown'

export interface UseLocationResult {
  coordinates: Coordinates | null
  error: GeolocationError | null
  loading: boolean
  requestLocation: () => void
  setManualLocation: (coords: Coordinates, displayName: string) => void
  clearLocation: () => void
  isSupported: boolean
  lastUpdated: number | null
  displayName: string | null
  source: LocationSource | null
}
interface CachedLocation {
  coordinates: Coordinates
  timestamp: number
  displayName: string
  source: LocationSource
}
const LOCATION_CACHE_KEY = 'userLocation'
const LEGACY_CACHE_KEYS = ['reentry-map-user-selected-location', 'reentry-map-geoip-location']
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000
const REFRESH_INTERVAL = 2 * 60 * 1000

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false
  const coords = value as Record<string, unknown>
  return (
    typeof coords.latitude === 'number' &&
    Number.isFinite(coords.latitude) &&
    Math.abs(coords.latitude) <= 90 &&
    typeof coords.longitude === 'number' &&
    Number.isFinite(coords.longitude) &&
    Math.abs(coords.longitude) <= 180
  )
}
function validLabel(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const label = value.trim()
  if (
    label
      .split(',')
      .some((part) => ['undefined', 'null', 'nan'].includes(part.trim().toLowerCase()))
  )
    return null
  return label
}
function removeCache(keys: string[]) {
  for (const key of keys) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* Storage is optional. */
    }
  }
}
function loadFromCache(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<CachedLocation> | null
    const label = validLabel(data?.displayName)
    const age = Date.now() - Number(data?.timestamp)
    if (
      data &&
      isValidCoordinates(data.coordinates) &&
      label &&
      typeof data.timestamp === 'number' &&
      Number.isFinite(age) &&
      age >= 0 &&
      age < CACHE_DURATION &&
      (data.source === 'manual' || data.source === 'geolocation' || data.source === 'geoip')
    ) {
      return {
        coordinates: data.coordinates,
        displayName: label,
        timestamp: data.timestamp,
        source: data.source,
      }
    }
  } catch {
    /* Invalid or inaccessible cache is not a location. */
  }
  removeCache([LOCATION_CACHE_KEY])
  return null
}
function saveToCache(location: CachedLocation) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location))
  } catch {
    /* Storage is optional. */
  }
}
function parseGeoIP(value: unknown): CachedLocation | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (data.isDefaultLocation || data.error || !isValidCoordinates(data)) return null
  const label = validLabel(
    [validLabel(data.city), validLabel(data.region)].filter(Boolean).join(', ')
  )
  if (!label) return null
  return {
    coordinates: { latitude: data.latitude, longitude: data.longitude },
    displayName: label,
    source: 'geoip',
    timestamp: Date.now(),
  }
}

/** One owner for validated location state, persistence and lower-priority GeoIP discovery. */
export function useLocation(autoRequest = false): UseLocationResult {
  const [location, setLocation] = useState<CachedLocation | null>(null)
  const [error, setError] = useState<GeolocationError | null>(null)
  const [loading, setLoading] = useState(false)
  const generation = useRef(0)
  const mounted = useRef(true)
  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.geolocation?.getCurrentPosition === 'function'

  const commitLocation = useCallback((next: CachedLocation) => {
    setLocation(next)
    setError(null)
    setLoading(false)
    saveToCache(next)
  }, [])

  const acceptGPS = useCallback(
    (position: GeolocationPosition, requestGeneration: number) => {
      if (!mounted.current || generation.current !== requestGeneration) return
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      if (!isValidCoordinates(coords)) {
        setError('position-unavailable')
        setLoading(false)
        return
      }
      commitLocation({
        coordinates: coords,
        displayName: 'Current Location',
        source: 'geolocation',
        timestamp: Date.now(),
      })
    },
    [commitLocation]
  )

  const requestLocation = useCallback(() => {
    const requestGeneration = ++generation.current
    if (!isSupported) {
      setError('not-supported')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => acceptGPS(position, requestGeneration),
      (failure) => {
        if (!mounted.current || generation.current !== requestGeneration) return
        setLoading(false)
        setLocation(null)
        setError(
          failure.code === 1
            ? 'permission-denied'
            : failure.code === 2
              ? 'position-unavailable'
              : failure.code === 3
                ? 'timeout'
                : 'unknown'
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [isSupported, acceptGPS])

  const setManualLocation = useCallback(
    (coords: Coordinates, name: string) => {
      const label = validLabel(name)
      if (!isValidCoordinates(coords) || !label) return
      ++generation.current
      commitLocation({
        coordinates: coords,
        displayName: label,
        source: 'manual',
        timestamp: Date.now(),
      })
    },
    [commitLocation]
  )

  const clearLocation = useCallback(() => {
    ++generation.current
    setLocation(null)
    setError(null)
    setLoading(false)
    removeCache([LOCATION_CACHE_KEY, ...LEGACY_CACHE_KEYS])
  }, [])

  useEffect(() => {
    mounted.current = true
    let cancelled = false
    const requestGeneration = generation.current
    removeCache(LEGACY_CACHE_KEYS)
    const cached = loadFromCache()
    if (cached && requestGeneration === 0) setLocation(cached)
    else if (requestGeneration === 0) {
      void (async () => {
        try {
          const response = await fetch('/api/location/ip')
          if (!response.ok) return
          const detected = parseGeoIP(await response.json())
          if (detected && !cancelled && generation.current === requestGeneration)
            commitLocation(detected)
        } catch {
          /* GeoIP is optional; manual search remains available. */
        }
      })()
    }
    return () => {
      cancelled = true
      mounted.current = false
    }
  }, [commitLocation])

  useEffect(() => {
    if (autoRequest && isSupported) requestLocation()
  }, [autoRequest, isSupported, requestLocation])

  useEffect(() => {
    if (location?.source !== 'geolocation' || !isSupported) return
    const intervalId = setInterval(() => {
      const requestGeneration = generation.current
      navigator.geolocation.getCurrentPosition(
        (position) => acceptGPS(position, requestGeneration),
        () => {
          /* Keep the last successful GPS location on a background failure. */
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      )
    }, REFRESH_INTERVAL)
    return () => clearInterval(intervalId)
  }, [location?.source, isSupported, acceptGPS])

  return {
    coordinates: location?.coordinates || null,
    displayName: location?.displayName || null,
    source: location?.source || null,
    lastUpdated: location?.timestamp || null,
    error,
    loading,
    requestLocation,
    setManualLocation,
    clearLocation,
    isSupported,
  }
}

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
