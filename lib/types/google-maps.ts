/**
 * TypeScript type definitions for Google Maps API responses
 * These are for SERVER-SIDE REST API calls, not client-side JS library
 */

/**
 * Google Maps Geocoding API Response
 * https://developers.google.com/maps/documentation/geocoding/requests-geocoding#GeocodingResponses
 */
export interface GoogleMapsGeocodingResponse {
  /**
   * Status of the geocoding request
   * - OK: successful geocode
   * - ZERO_RESULTS: no results found
   * - OVER_QUERY_LIMIT: quota exceeded
   * - REQUEST_DENIED: API key invalid or geocoding not enabled
   * - INVALID_REQUEST: missing address or latlng
   * - UNKNOWN_ERROR: server error, retry may succeed
   */
  status:
    | 'OK'
    | 'ZERO_RESULTS'
    | 'OVER_QUERY_LIMIT'
    | 'REQUEST_DENIED'
    | 'INVALID_REQUEST'
    | 'UNKNOWN_ERROR'

  /**
   * Array of geocoding results (can be multiple for ambiguous addresses)
   * Only present when status is 'OK'
   */
  results: GoogleMapsGeocodingResult[]

  /**
   * Error message when status is not 'OK'
   * Only present on error
   */
  error_message?: string
}

/**
 * Individual geocoding result from Google Maps API
 */
export interface GoogleMapsGeocodingResult {
  /**
   * Human-readable address
   */
  formatted_address: string

  /**
   * Geometry information (location, bounds, viewport)
   */
  geometry: {
    /**
     * Geocoded latitude/longitude coordinates
     */
    location: {
      lat: number
      lng: number
    }

    /**
     * Accuracy of geocoding result
     * - ROOFTOP: precise address
     * - RANGE_INTERPOLATED: interpolated between two precise points
     * - GEOMETRIC_CENTER: center of polyline or polygon (e.g., street)
     * - APPROXIMATE: approximate location (e.g., postal code)
     */
    location_type: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE'

    /**
     * Bounding box for viewport
     */
    viewport?: {
      northeast: { lat: number; lng: number }
      southwest: { lat: number; lng: number }
    }

    /**
     * Bounding box (may differ from viewport for large areas)
     */
    bounds?: {
      northeast: { lat: number; lng: number }
      southwest: { lat: number; lng: number }
    }
  }

  /**
   * Address broken into components (street, city, state, country, etc.)
   */
  address_components: Array<{
    /**
     * Full name of component (e.g., "California")
     */
    long_name: string

    /**
     * Abbreviated name (e.g., "CA")
     */
    short_name: string

    /**
     * Array of types for this component
     * Examples: ["locality", "political"], ["administrative_area_level_1", "political"]
     */
    types: string[]
  }>

  /**
   * Unique stable ID for this place
   * Useful for deduplication and place details lookups
   */
  place_id: string

  /**
   * Array of types for this result
   * Examples: ["street_address"], ["route"], ["political"]
   */
  types?: string[]

  /**
   * Indicates result is approximate (partial match)
   */
  partial_match?: boolean

  /**
   * Plus code for this location (Open Location Code)
   */
  plus_code?: {
    global_code: string
    compound_code?: string
  }
}
