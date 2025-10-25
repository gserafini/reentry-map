/**
 * Distance calculation utilities using the Haversine formula
 * for calculating distances between geographic coordinates
 */

export interface Coordinates {
  latitude: number
  longitude: number
}

export type DistanceUnit = 'miles' | 'kilometers'

/**
 * Earth's radius in different units
 */
const EARTH_RADIUS = {
  miles: 3959, // miles
  kilometers: 6371, // kilometers
} as const

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate distance between two geographic points using the Haversine formula
 *
 * @param point1 - First coordinate point
 * @param point2 - Second coordinate point
 * @param unit - Unit of measurement (default: miles)
 * @returns Distance in the specified unit
 *
 * @example
 * const distance = calculateDistance(
 *   { latitude: 37.8044, longitude: -122.2712 }, // Oakland
 *   { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
 *   'miles'
 * )
 * // Returns: ~12.5 miles
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates,
  unit: DistanceUnit = 'miles'
): number {
  const lat1 = toRadians(point1.latitude)
  const lat2 = toRadians(point2.latitude)
  const deltaLat = toRadians(point2.latitude - point1.latitude)
  const deltaLon = toRadians(point2.longitude - point1.longitude)

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const distance = EARTH_RADIUS[unit] * c

  return distance
}

/**
 * Format distance for display with appropriate precision
 *
 * @param distance - Distance value
 * @param unit - Unit of measurement
 * @param precision - Number of decimal places (default: 1)
 * @returns Formatted distance string
 *
 * @example
 * formatDistance(12.456, 'miles') // "12.5 miles"
 * formatDistance(0.3, 'miles')    // "0.3 miles"
 * formatDistance(1.0, 'miles')    // "1.0 mile"
 */
export function formatDistance(
  distance: number,
  unit: DistanceUnit = 'miles',
  precision: number = 1
): string {
  const roundedDistance = Number(distance.toFixed(precision))
  const unitLabel = roundedDistance === 1 ? unit.slice(0, -1) : unit // Remove 's' for singular
  return `${roundedDistance} ${unitLabel}`
}

/**
 * Format distance with smart precision based on distance value
 * - Less than 0.1: shows 2 decimal places
 * - Less than 1: shows 1 decimal place
 * - 1 or more: shows 1 decimal place
 *
 * @param distance - Distance value
 * @param unit - Unit of measurement
 * @returns Formatted distance string
 *
 * @example
 * formatDistanceSmart(0.05, 'miles')  // "0.05 miles"
 * formatDistanceSmart(0.3, 'miles')   // "0.3 miles"
 * formatDistanceSmart(12.456, 'miles') // "12.5 miles"
 */
export function formatDistanceSmart(distance: number, unit: DistanceUnit = 'miles'): string {
  let precision = 1

  if (distance < 0.1) {
    precision = 2
  }

  return formatDistance(distance, unit, precision)
}

/**
 * Check if a point is within a certain radius of another point
 *
 * @param point1 - First coordinate point
 * @param point2 - Second coordinate point
 * @param radius - Maximum distance
 * @param unit - Unit of measurement
 * @returns True if point2 is within radius of point1
 *
 * @example
 * const isNearby = isWithinRadius(
 *   { latitude: 37.8044, longitude: -122.2712 },
 *   { latitude: 37.8050, longitude: -122.2700 },
 *   1,
 *   'miles'
 * )
 */
export function isWithinRadius(
  point1: Coordinates,
  point2: Coordinates,
  radius: number,
  unit: DistanceUnit = 'miles'
): boolean {
  const distance = calculateDistance(point1, point2, unit)
  return distance <= radius
}

/**
 * Sort an array of items with coordinates by distance from a reference point
 *
 * @param items - Array of items with latitude/longitude
 * @param referencePoint - Point to calculate distance from
 * @param unit - Unit of measurement
 * @returns Sorted array (closest first) with distance added
 *
 * @example
 * const sortedResources = sortByDistance(
 *   resources,
 *   { latitude: 37.8044, longitude: -122.2712 },
 *   'miles'
 * )
 */
export function sortByDistance<T extends { latitude: number; longitude: number }>(
  items: T[],
  referencePoint: Coordinates,
  unit: DistanceUnit = 'miles'
): (T & { distance: number })[] {
  return items
    .map((item) => ({
      ...item,
      distance: calculateDistance(
        { latitude: item.latitude, longitude: item.longitude },
        referencePoint,
        unit
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
}
