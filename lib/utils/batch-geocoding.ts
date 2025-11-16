/**
 * Server-Side Batch Geocoding Utility
 * For bulk imports using Google Maps Geocoding API REST endpoint
 */

import { env } from '@/lib/env'
import type { GeocodedAddress, GeocodeResult, AddressToGeocode } from '@/lib/data-sources/types'

/**
 * Geocode a single address using Google Maps Geocoding API (server-side)
 */
export async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zip?: string
): Promise<GeocodeResult> {
  try {
    // Build full address
    const addressParts = [address, city, state, zip].filter(Boolean)
    const fullAddress = addressParts.join(', ')

    // Call Google Maps Geocoding API
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', fullAddress)
    url.searchParams.set('key', env.GOOGLE_MAPS_KEY)

    const response = await fetch(url)

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = (await response.json()) as GoogleMapsGeocodeResponse

    if (data.status !== 'OK') {
      // Handle specific error statuses
      if (data.status === 'ZERO_RESULTS') {
        return {
          success: false,
          error: 'No results found for this address',
        }
      }

      if (data.status === 'OVER_QUERY_LIMIT') {
        return {
          success: false,
          error: 'API rate limit exceeded',
        }
      }

      return {
        success: false,
        error: `Geocoding failed: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`,
      }
    }

    if (!data.results || data.results.length === 0) {
      return {
        success: false,
        error: 'No results returned from geocoding API',
      }
    }

    const result = data.results[0]

    // Extract county and other metadata
    const countyComponent = result.address_components.find((c) =>
      c.types.includes('administrative_area_level_2')
    )

    const neighborhoodComponent = result.address_components.find((c) =>
      c.types.includes('neighborhood')
    )

    // Determine confidence based on location_type
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    if (result.geometry.location_type === 'ROOFTOP') {
      confidence = 'high'
    } else if (result.geometry.location_type === 'GEOMETRIC_CENTER') {
      confidence = 'low'
    }

    return {
      success: true,
      data: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        location_type: result.geometry.location_type,
        county: countyComponent?.long_name,
        neighborhood: neighborhoodComponent?.long_name,
        confidence,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during geocoding',
    }
  }
}

/**
 * Batch geocode multiple addresses with rate limiting
 */
export async function batchGeocode(
  addresses: AddressToGeocode[],
  options: {
    delayMs?: number // Delay between requests to respect rate limits
    onProgress?: (processed: number, total: number, current: AddressToGeocode) => void
    stopOnError?: boolean // Stop processing if geocoding fails
  } = {}
): Promise<GeocodeResult[]> {
  const { delayMs = 100, onProgress, stopOnError = false } = options
  const results: GeocodeResult[] = []

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i]

    // Report progress
    if (onProgress) {
      onProgress(i + 1, addresses.length, addr)
    }

    // Geocode address
    const result = await geocodeAddress(addr.address, addr.city, addr.state, addr.zip)
    results.push(result)

    // Stop on error if requested
    if (stopOnError && !result.success) {
      throw new Error(`Geocoding failed for address ${i + 1}: ${result.error}`)
    }

    // Delay to respect rate limits (10 requests/second = 100ms delay)
    if (delayMs > 0 && i < addresses.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}

/**
 * Calculate geocoding cost estimate
 * Google Maps Geocoding API pricing: $0.005 per geocode
 */
export function estimateGeocodingCost(count: number): number {
  const costPerGeocode = 0.005 // $0.005 per geocode
  return count * costPerGeocode
}

/**
 * Calculate success rate from geocoding results
 */
export function calculateSuccessRate(results: GeocodeResult[]): number {
  if (results.length === 0) return 0

  const successCount = results.filter((r) => r.success).length
  return (successCount / results.length) * 100
}

/**
 * Get failed geocoding results for debugging
 */
export function getFailedGeocodings(
  results: GeocodeResult[],
  addresses: AddressToGeocode[]
): Array<{ address: AddressToGeocode; error: string; index: number }> {
  const failures: Array<{ address: AddressToGeocode; error: string; index: number }> = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (!result.success) {
      failures.push({
        address: addresses[i],
        error: result.error || 'Unknown error',
        index: i,
      })
    }
  }

  return failures
}

/**
 * Retry failed geocodings
 */
export async function retryFailedGeocodings(
  addresses: AddressToGeocode[],
  previousResults: GeocodeResult[],
  maxRetries = 3,
  delayMs = 100
): Promise<GeocodeResult[]> {
  const results = [...previousResults]
  const failedIndices = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !r.success)
    .map(({ i }) => i)

  if (failedIndices.length === 0) {
    return results
  }

  console.log(`Retrying ${failedIndices.length} failed geocodings (max ${maxRetries} attempts)...`)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const stillFailed = failedIndices.filter((i) => !results[i].success)

    if (stillFailed.length === 0) {
      break
    }

    console.log(`Retry attempt ${attempt}/${maxRetries} for ${stillFailed.length} addresses...`)

    for (const i of stillFailed) {
      const addr = addresses[i]
      const result = await geocodeAddress(addr.address, addr.city, addr.state, addr.zip)
      results[i] = result

      // Longer delay between retries
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
      }
    }
  }

  return results
}

// =============================================================================
// Google Maps API Response Types
// =============================================================================

interface GoogleMapsGeocodeResponse {
  status:
    | 'OK'
    | 'ZERO_RESULTS'
    | 'OVER_QUERY_LIMIT'
    | 'REQUEST_DENIED'
    | 'INVALID_REQUEST'
    | 'UNKNOWN_ERROR'
  error_message?: string
  results: Array<{
    address_components: Array<{
      long_name: string
      short_name: string
      types: string[]
    }>
    formatted_address: string
    geometry: {
      location: {
        lat: number
        lng: number
      }
      location_type: string
    }
    place_id: string
    types: string[]
  }>
}
