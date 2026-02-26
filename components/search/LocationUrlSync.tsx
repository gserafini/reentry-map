'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useUserLocation } from '@/lib/context/LocationContext'

/**
 * Syncs user location from LocationContext into URL params.
 *
 * When location is available (cached, geolocation, or GeoIP) and lat/lng
 * are NOT already in URL params, this component pushes them to the URL
 * so the server component can use them for distance-based sorting.
 *
 * Also sets sort=distance-asc as default when syncing location, unless
 * the user has already explicitly set a sort preference.
 */
export function LocationUrlSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { coordinates } = useUserLocation()
  const hasSynced = useRef(false)

  useEffect(() => {
    // Only sync once per mount
    if (hasSynced.current) return

    // Need coordinates to sync
    if (!coordinates) return

    // If lat/lng already in URL, don't override
    if (searchParams.has('lat') && searchParams.has('lng')) {
      hasSynced.current = true
      return
    }

    hasSynced.current = true

    const params = new URLSearchParams(searchParams.toString())
    params.set('lat', coordinates.latitude.toFixed(4))
    params.set('lng', coordinates.longitude.toFixed(4))

    // Set default distance if not present
    if (!params.has('distance')) {
      params.set('distance', '25')
    }

    // Default to distance sort if user hasn't explicitly chosen a sort
    if (!params.has('sort')) {
      params.set('sort', 'distance-asc')
    }

    // Reset page when changing to distance sort
    params.delete('page')

    const newUrl = `${pathname}?${params.toString()}`
    router.replace(newUrl)
  }, [coordinates, searchParams, pathname, router])

  return null
}
