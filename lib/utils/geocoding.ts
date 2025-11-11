/**
 * Geocoding utilities for address-to-coordinates conversion
 */

export interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress?: string
  county?: string // County name (e.g., "Alameda")
  state?: string // State code (e.g., "CA")
  city?: string // City name (e.g., "Oakland")
  zip?: string // ZIP code (e.g., "94612")
  neighborhood?: string // Neighborhood name (e.g., "Fruitvale")
  placeId?: string // Google Place ID (stable unique identifier)
  locationType?: string // Accuracy: ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
}

/**
 * Helper: Clean county name by removing " County", " Parish", etc. suffixes
 */
function cleanCountyName(name: string): string {
  return name.replace(/ (County|Parish|Borough|Census Area|Municipality)$/i, '')
}

/**
 * Helper: Extract address component by type from Google geocoding results
 */
function extractAddressComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
  useShortName = false
): string | null {
  const component = components.find((c) => c.types.includes(type))
  if (!component) return null
  return useShortName ? component.short_name : component.long_name
}

/**
 * Geocode an address string to latitude/longitude coordinates
 * Uses Google Maps Geocoding API and extracts county, state, city
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
        const components = result.results[0].address_components

        // Extract county from administrative_area_level_2
        const countyRaw = extractAddressComponent(components, 'administrative_area_level_2')
        const county = countyRaw ? cleanCountyName(countyRaw) : undefined

        // Extract state code from administrative_area_level_1
        const state =
          extractAddressComponent(components, 'administrative_area_level_1', true) || undefined

        // Extract city from locality
        const city = extractAddressComponent(components, 'locality') || undefined

        // Extract ZIP code from postal_code
        const zip = extractAddressComponent(components, 'postal_code') || undefined

        // Extract neighborhood from neighborhood
        const neighborhood = extractAddressComponent(components, 'neighborhood') || undefined

        // Extract Google Place ID (stable unique identifier for deduplication)
        const placeId = result.results[0].place_id || undefined

        // Extract location_type (geocoding accuracy indicator)
        const locationType = result.results[0].geometry.location_type || undefined

        return {
          latitude: location.lat(),
          longitude: location.lng(),
          formattedAddress: result.results[0].formatted_address,
          county,
          state,
          city,
          zip,
          neighborhood,
          placeId,
          locationType,
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
