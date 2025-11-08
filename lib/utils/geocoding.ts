/**
 * Geocoding utilities for address-to-coordinates conversion
 */

export interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress?: string
}

/**
 * Geocode an address string to latitude/longitude coordinates
 * Uses Google Maps Geocoding API
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim() === '') {
    return null
  }

  try {
    // Use browser's Geocoding API if available (client-side)
    if (typeof window !== 'undefined' && 'google' in window) {
      const { Geocoder } = (await google.maps.importLibrary(
        'geocoding'
      )) as google.maps.GeocodingLibrary
      const geocoder = new Geocoder()

      const result = await geocoder.geocode({ address })

      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location
        return {
          latitude: location.lat(),
          longitude: location.lng(),
          formattedAddress: result.results[0].formatted_address,
        }
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && 'google' in window) {
      const { Geocoder } = (await google.maps.importLibrary(
        'geocoding'
      )) as google.maps.GeocodingLibrary
      const geocoder = new Geocoder()

      const result = await geocoder.geocode({
        location: { lat: latitude, lng: longitude },
      })

      if (result.results && result.results.length > 0) {
        return result.results[0].formatted_address
      }
    }

    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}
