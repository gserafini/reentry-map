/**
 * County assignment utilities for resources
 *
 * Automatically determines county from geocoding results or coordinates
 * Uses Google geocoding county data first, falls back to PostGIS
 */

import { createClient } from '@/lib/supabase/server'

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
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('county_data')
      .select('fips_code')
      .eq('county_name', countyName)
      .eq('state_code', stateCode.toUpperCase())
      .single()

    if (error || !data) return null

    return data.fips_code
  } catch (error) {
    console.error('Error looking up county FIPS:', error)
    return null
  }
}

/**
 * Determine county from coordinates using database query
 *
 * Note: This is a server-side function that requires database access.
 * For client-side usage, call the API endpoint instead.
 */
export async function determineCountyFromCoordinates(
  latitude: number | null,
  longitude: number | null
): Promise<CountyResult | null> {
  if (!latitude || !longitude) return null

  try {
    const supabase = await createClient()

    // Use PostGIS ST_Contains for accurate point-in-polygon testing
    // This is a database query, so it's slower than city lookup but more accurate
    const { data, error } = await supabase.rpc('find_county_for_point', {
      lat: latitude,
      lng: longitude,
    })

    if (error) {
      console.error('Error finding county for coordinates:', error)
      return null
    }

    if (data && data.length > 0) {
      return {
        county: data[0].county_name,
        county_fips: data[0].fips_code,
        method: 'coordinates',
      }
    }

    return null
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
  if (latitude && longitude) {
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
