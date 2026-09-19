'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useUserLocation } from '@/lib/context/LocationContext'

/** Opt-in location suggestion for entry pages; explicit URL scopes always win. */
export function LocationUrlSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { coordinates, displayName } = useUserLocation()
  const hasSynced = useRef(false)
  useEffect(() => {
    if (hasSynced.current || !coordinates) return
    if (['lat', 'lng', 'locationName', 'north', 'scope'].some((key) => searchParams.has(key))) {
      hasSynced.current = true
      return
    }
    if (!Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) return
    hasSynced.current = true
    const params = new URLSearchParams(searchParams.toString())
    params.set('lat', coordinates.latitude.toFixed(4))
    params.set('lng', coordinates.longitude.toFixed(4))
    if (displayName) params.set('locationName', displayName)
    if (!params.has('distance')) params.set('distance', '25')
    if (!params.has('sort')) params.set('sort', 'distance-asc')
    params.delete('page')
    router.replace(`${pathname}?${params}`, { scroll: false })
  }, [coordinates, displayName, searchParams, pathname, router])
  return null
}
