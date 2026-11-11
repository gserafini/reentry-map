/**
 * County assignment utilities for resources
 *
 * Automatically determines county from geocoding results or coordinates
 * Uses Google geocoding county data first, then bundled county polygons
 */

import { sql } from '@/lib/db/client'
import { findCountyForCoordinates } from '@/lib/server/county-geometry.mjs'

export interface CountyResult {
  county: string // Clean name without " County" suffix (e.g., "Alameda")
  county_fips: string // 5-digit FIPS code (e.g., "06001")
  method?: 'geocoding' | 'fips-lookup' | 'coordinates'
}

/**
 * Look up FIPS code from county name and state code
 *
 * This is a fast indexed database query (< 1ms)
 */
export async function lookupCountyFips(
  countyName: string | null,
  stateCode: string | null
): Promise<string | null> {
  if (!countyName || !stateCode) return null

  try {
    const rows = await sql<{ fips_code: string }[]>`
      SELECT fips_code FROM county_data
      WHERE county_name = ${countyName}
        AND state_code = ${stateCode.toUpperCase()}
      LIMIT 1
    `

    if (!rows.length) return null

    return rows[0].fips_code
  } catch (error) {
    console.error('Error looking up county FIPS:', error)
    return null
  }
}

/**
 * Determine county from coordinates using the shared bundled county polygons
 *
 * This is server-side because it reads the bundled GeoJSON file.
 */
export async function determineCountyFromCoordinates(
  latitude: number | null,
  longitude: number | null
): Promise<CountyResult | null> {
  if (latitude === null || longitude === null) return null

  try {
    const county = findCountyForCoordinates(latitude, longitude)
    return county
      ? { county: county.county_name, county_fips: county.fips_code, method: 'coordinates' }
      : null
  } catch (error) {
    console.error('Error in determineCountyFromCoordinates:', error)
    return null
  }
}

/**
 * Determine county using hybrid approach (server-side only)
 *
 * Strategy:
 * 1. If county name + state already known (from geocoding) → look up FIPS (< 1ms)
 * 2. Fall back to point-in-polygon using coordinates (~100ms)
 *
 * This function should be called whenever a resource is created or updated.
 * Best used AFTER geocoding, since geocoding already provides county name.
 */
export async function determineCounty(
  countyName: string | null,
  state: string | null,
  latitude: number | null,
  longitude: number | null
): Promise<CountyResult | null> {
  // Strategy 1: If we have county name from geocoding, just look up FIPS
  if (countyName && state) {
    const fips = await lookupCountyFips(countyName, state)
    if (fips) {
      return {
        county: countyName,
        county_fips: fips,
        method: 'fips-lookup',
      }
    }
  }

  // Strategy 2: Coordinate-based lookup (fallback for missing geocoding data)
  if (latitude !== null && longitude !== null) {
    return await determineCountyFromCoordinates(latitude, longitude)
  }

  return null
}

/**
 * Client-side county determination (calls API endpoint)
 *
 * Use this from client components. For server components, use determineCounty() directly.
 */
export async function determineCountyClient(
  city: string | null,
  state: string | null,
  latitude: number | null,
  longitude: number | null
): Promise<CountyResult | null> {
  try {
    const params = new URLSearchParams()
    if (city) params.append('city', city)
    if (state) params.append('state', state)
    if (latitude) params.append('lat', latitude.toString())
    if (longitude) params.append('lng', longitude.toString())

    const response = await fetch(`/api/utils/determine-county?${params}`)

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as { county?: CountyResult | null; error?: string }
    return data.county || null
  } catch (error) {
    console.error('Error determining county:', error)
    return null
  }
}
