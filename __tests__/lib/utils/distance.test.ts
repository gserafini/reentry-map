import { describe, it, expect } from 'vitest'
import {
  calculateDistance,
  formatDistance,
  formatDistanceSmart,
  isWithinRadius,
  sortByDistance,
  type Coordinates,
} from '@/lib/utils/distance'

describe('Distance Utilities', () => {
  // Test coordinates (real locations in Oakland area)
  const oakland: Coordinates = { latitude: 37.8044, longitude: -122.2712 }
  const sanFrancisco: Coordinates = { latitude: 37.7749, longitude: -122.4194 }
  const berkeley: Coordinates = { latitude: 37.8715, longitude: -122.273 }

  describe('calculateDistance', () => {
    it('calculates distance between Oakland and San Francisco in miles', () => {
      const distance = calculateDistance(oakland, sanFrancisco, 'miles')
      // Expected: ~8.3 miles (straight-line distance)
      expect(distance).toBeGreaterThan(8)
      expect(distance).toBeLessThan(9)
    })

    it('calculates distance between Oakland and Berkeley in miles', () => {
      const distance = calculateDistance(oakland, berkeley, 'miles')
      // Expected: ~4-5 miles
      expect(distance).toBeGreaterThan(4)
      expect(distance).toBeLessThan(5)
    })

    it('calculates distance in kilometers', () => {
      const distanceMiles = calculateDistance(oakland, sanFrancisco, 'miles')
      const distanceKm = calculateDistance(oakland, sanFrancisco, 'kilometers')

      // 1 mile ≈ 1.60934 km
      expect(distanceKm).toBeCloseTo(distanceMiles * 1.60934, 0)
    })

    it('returns 0 for the same point', () => {
      const distance = calculateDistance(oakland, oakland, 'miles')
      expect(distance).toBe(0)
    })

    it('defaults to miles when unit not specified', () => {
      const distance = calculateDistance(oakland, sanFrancisco)
      expect(distance).toBeGreaterThan(8)
      expect(distance).toBeLessThan(9)
    })

    it('handles negative coordinates correctly', () => {
      const point1: Coordinates = { latitude: -33.8688, longitude: 151.2093 } // Sydney
      const point2: Coordinates = { latitude: -37.8136, longitude: 144.9631 } // Melbourne
      const distance = calculateDistance(point1, point2, 'kilometers')

      // Expected: ~700-800 km
      expect(distance).toBeGreaterThan(700)
      expect(distance).toBeLessThan(800)
    })
  })

  describe('formatDistance', () => {
    it('formats distance with default precision (1 decimal)', () => {
      expect(formatDistance(12.456, 'miles')).toBe('12.5 miles')
    })

    it('formats distance with custom precision', () => {
      expect(formatDistance(12.456, 'miles', 2)).toBe('12.46 miles')
      expect(formatDistance(12.456, 'miles', 0)).toBe('12 miles')
    })

    it('uses singular form for distance of 1', () => {
      expect(formatDistance(1.0, 'miles')).toBe('1 mile')
      expect(formatDistance(1.0, 'kilometers')).toBe('1 kilometer')
    })

    it('uses plural form for distance not equal to 1', () => {
      expect(formatDistance(0.5, 'miles')).toBe('0.5 miles')
      expect(formatDistance(2.0, 'miles')).toBe('2 miles')
      expect(formatDistance(0, 'miles')).toBe('0 miles')
    })

    it('formats kilometers correctly', () => {
      expect(formatDistance(20.5, 'kilometers')).toBe('20.5 kilometers')
    })

    it('defaults to miles when unit not specified', () => {
      expect(formatDistance(5.5)).toBe('5.5 miles')
    })
  })

  describe('formatDistanceSmart', () => {
    it('uses 2 decimal places for distances less than 0.1', () => {
      expect(formatDistanceSmart(0.05, 'miles')).toBe('0.05 miles')
      expect(formatDistanceSmart(0.09, 'miles')).toBe('0.09 miles')
    })

    it('uses 1 decimal place for distances 0.1 and above', () => {
      expect(formatDistanceSmart(0.3, 'miles')).toBe('0.3 miles')
      expect(formatDistanceSmart(12.456, 'miles')).toBe('12.5 miles')
    })

    it('handles singular/plural forms correctly', () => {
      expect(formatDistanceSmart(1.0, 'miles')).toBe('1 mile')
      expect(formatDistanceSmart(2.0, 'miles')).toBe('2 miles')
    })
  })

  describe('isWithinRadius', () => {
    it('returns true when point is within radius', () => {
      // Oakland to Berkeley is ~4.5 miles
      expect(isWithinRadius(oakland, berkeley, 5, 'miles')).toBe(true)
      expect(isWithinRadius(oakland, berkeley, 10, 'miles')).toBe(true)
    })

    it('returns false when point is outside radius', () => {
      // Oakland to Berkeley is ~4.5 miles
      expect(isWithinRadius(oakland, berkeley, 4, 'miles')).toBe(false)
      expect(isWithinRadius(oakland, berkeley, 1, 'miles')).toBe(false)
    })

    it('returns true for the exact radius boundary', () => {
      // Oakland to San Francisco is ~12.5 miles
      const distance = calculateDistance(oakland, sanFrancisco, 'miles')
      expect(isWithinRadius(oakland, sanFrancisco, distance, 'miles')).toBe(true)
    })

    it('works with kilometers', () => {
      // Oakland to Berkeley is ~7-8 km
      expect(isWithinRadius(oakland, berkeley, 10, 'kilometers')).toBe(true)
      expect(isWithinRadius(oakland, berkeley, 5, 'kilometers')).toBe(false)
    })

    it('returns true for the same point at any radius', () => {
      expect(isWithinRadius(oakland, oakland, 0, 'miles')).toBe(true)
      expect(isWithinRadius(oakland, oakland, 1, 'miles')).toBe(true)
    })
  })

  describe('sortByDistance', () => {
    const resources = [
      { id: '1', name: 'San Francisco Resource', latitude: 37.7749, longitude: -122.4194 },
      { id: '2', name: 'Oakland Resource', latitude: 37.8044, longitude: -122.2712 },
      { id: '3', name: 'Berkeley Resource', latitude: 37.8715, longitude: -122.273 },
    ]

    it('sorts items by distance from reference point (closest first)', () => {
      const sorted = sortByDistance(resources, oakland, 'miles')

      // Order should be: Oakland (0), Berkeley (~4.5), San Francisco (~8.3)
      expect(sorted[0].id).toBe('2') // Oakland
      expect(sorted[1].id).toBe('3') // Berkeley
      expect(sorted[2].id).toBe('1') // San Francisco
    })

    it('adds distance property to each item', () => {
      const sorted = sortByDistance(resources, oakland, 'miles')

      expect(sorted[0]).toHaveProperty('distance')
      expect(sorted[0].distance).toBe(0) // Same location
      expect(sorted[1].distance).toBeGreaterThan(4)
      expect(sorted[1].distance).toBeLessThan(5)
    })

    it('works with kilometers', () => {
      const sorted = sortByDistance(resources, oakland, 'kilometers')

      expect(sorted[0].id).toBe('2')
      expect(sorted[0].distance).toBe(0)
      expect(sorted[1].distance).toBeGreaterThan(7)
      expect(sorted[1].distance).toBeLessThan(8)
    })

    it('preserves original item properties', () => {
      const sorted = sortByDistance(resources, oakland, 'miles')

      expect(sorted[0]).toMatchObject({
        id: '2',
        name: 'Oakland Resource',
        latitude: 37.8044,
        longitude: -122.2712,
      })
    })

    it('handles empty array', () => {
      const sorted = sortByDistance([], oakland, 'miles')
      expect(sorted).toEqual([])
    })

    it('handles single item', () => {
      const sorted = sortByDistance([resources[0]], oakland, 'miles')
      expect(sorted).toHaveLength(1)
      expect(sorted[0].id).toBe('1')
    })
  })
})
