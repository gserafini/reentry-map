import { describe, it, expect } from 'vitest'
import {
  generateCitySlug,
  generateStateSlug,
  parseCitySlug,
  parseStateSlug,
  generateCityStateSlug,
  parseCityStateSlug,
  generateResourceSlug,
  generateTagSlug,
  generateResourceUrl,
  generateStateUrl,
  generateCityUrl,
  generateNationalCategoryUrl,
  generateCategoryInCityUrl,
  generateNationalTagUrl,
  generateTagInCityUrl,
  generateShortResourceUrl,
  parseResourceUrl,
  parseOldSearchUrl,
  parseOldResourceUrl,
} from '@/lib/utils/urls'

describe('URL Generation & Parsing Utilities', () => {
  describe('generateCitySlug', () => {
    it('converts city name to lowercase hyphenated slug', () => {
      expect(generateCitySlug('San Francisco')).toBe('san-francisco')
    })

    it('handles single-word city', () => {
      expect(generateCitySlug('Oakland')).toBe('oakland')
    })

    it('handles multiple spaces', () => {
      expect(generateCitySlug('New  York  City')).toBe('new-york-city')
    })
  })

  describe('generateStateSlug', () => {
    it('converts state code to lowercase', () => {
      expect(generateStateSlug('CA')).toBe('ca')
    })

    it('handles already lowercase', () => {
      expect(generateStateSlug('ny')).toBe('ny')
    })
  })

  describe('parseCitySlug', () => {
    it('converts slug back to title case city name', () => {
      expect(parseCitySlug('san-francisco')).toBe('San Francisco')
    })

    it('handles single word', () => {
      expect(parseCitySlug('oakland')).toBe('Oakland')
    })
  })

  describe('parseStateSlug', () => {
    it('converts slug back to uppercase state code', () => {
      expect(parseStateSlug('ca')).toBe('CA')
    })
  })

  describe('generateCityStateSlug (legacy)', () => {
    it('generates combined city-state slug', () => {
      expect(generateCityStateSlug('Oakland', 'CA')).toBe('oakland-ca')
    })

    it('handles multi-word cities', () => {
      expect(generateCityStateSlug('San Francisco', 'CA')).toBe('san-francisco-ca')
    })
  })

  describe('parseCityStateSlug (legacy)', () => {
    it('parses combined slug into city and state', () => {
      expect(parseCityStateSlug('oakland-ca')).toEqual({
        city: 'Oakland',
        state: 'CA',
      })
    })

    it('handles multi-word cities', () => {
      expect(parseCityStateSlug('san-francisco-ca')).toEqual({
        city: 'San Francisco',
        state: 'CA',
      })
    })

    it('returns null for single-part slug (requires city and state)', () => {
      expect(parseCityStateSlug('oakland')).toBeNull()
    })
  })

  describe('generateResourceSlug', () => {
    it('converts resource name to URL-safe slug', () => {
      expect(generateResourceSlug('Oakland Job Center')).toBe('oakland-job-center')
    })

    it('removes special characters', () => {
      expect(generateResourceSlug("St. Mary's Food Bank")).toBe('st-marys-food-bank')
    })

    it('removes consecutive hyphens', () => {
      expect(generateResourceSlug('Test -- Resource')).toBe('test-resource')
    })

    it('truncates at 100 characters', () => {
      const longName = 'A'.repeat(200)
      expect(generateResourceSlug(longName).length).toBeLessThanOrEqual(100)
    })
  })

  describe('generateTagSlug', () => {
    it('converts tag to slug', () => {
      expect(generateTagSlug('Veterans Services')).toBe('veterans-services')
    })

    it('removes special characters', () => {
      expect(generateTagSlug('24/7 Emergency')).toBe('247-emergency')
    })
  })

  describe('generateResourceUrl', () => {
    it('generates /{state}/{city}/{slug} URL', () => {
      const resource = { id: '123', name: 'Oakland Job Center', city: 'Oakland', state: 'CA' }
      expect(generateResourceUrl(resource)).toBe('/ca/oakland/oakland-job-center')
    })

    it('falls back to /r/{id} when city is missing', () => {
      const resource = { id: '123', name: 'Test', city: null, state: 'CA' }
      expect(generateResourceUrl(resource)).toBe('/r/123')
    })

    it('falls back to /r/{id} when state is missing', () => {
      const resource = { id: '123', name: 'Test', city: 'Oakland', state: null }
      expect(generateResourceUrl(resource)).toBe('/r/123')
    })
  })

  describe('generateStateUrl', () => {
    it('generates /{state} URL', () => {
      expect(generateStateUrl('CA')).toBe('/ca')
    })
  })

  describe('generateCityUrl', () => {
    it('generates /{state}/{city} URL', () => {
      expect(generateCityUrl('Oakland', 'CA')).toBe('/ca/oakland')
    })
  })

  describe('generateNationalCategoryUrl', () => {
    it('generates /category/{category} URL', () => {
      expect(generateNationalCategoryUrl('employment')).toBe('/category/employment')
    })
  })

  describe('generateCategoryInCityUrl', () => {
    it('generates /{state}/{city}/category/{category} URL', () => {
      expect(generateCategoryInCityUrl('Oakland', 'CA', 'employment')).toBe(
        '/ca/oakland/category/employment'
      )
    })
  })

  describe('generateNationalTagUrl', () => {
    it('generates /tag/{tag} URL', () => {
      expect(generateNationalTagUrl('Veterans Services')).toBe('/tag/veterans-services')
    })
  })

  describe('generateTagInCityUrl', () => {
    it('generates /{state}/{city}/tag/{tag} URL', () => {
      expect(generateTagInCityUrl('Oakland', 'CA', 'Veterans Services')).toBe(
        '/ca/oakland/tag/veterans-services'
      )
    })
  })

  describe('generateShortResourceUrl', () => {
    it('generates /r/{id} URL', () => {
      expect(generateShortResourceUrl('abc123')).toBe('/r/abc123')
    })
  })

  describe('parseResourceUrl', () => {
    it('parses /{state}/{city}/{resource-slug} URL', () => {
      expect(parseResourceUrl('/ca/oakland/oakland-job-center')).toEqual({
        state: 'CA',
        city: 'Oakland',
        resourceSlug: 'oakland-job-center',
      })
    })

    it('handles multi-word city slugs', () => {
      expect(parseResourceUrl('/ca/san-francisco/food-bank')).toEqual({
        state: 'CA',
        city: 'San Francisco',
        resourceSlug: 'food-bank',
      })
    })

    it('returns null for invalid format (too few parts)', () => {
      expect(parseResourceUrl('/ca/oakland')).toBeNull()
    })

    it('returns null for invalid state code (too long)', () => {
      expect(parseResourceUrl('/california/oakland/test')).toBeNull()
    })

    it('returns null for empty path', () => {
      expect(parseResourceUrl('/')).toBeNull()
    })
  })

  describe('parseOldSearchUrl', () => {
    it('parses /search/{category}-in-{city}-{state} URL', () => {
      expect(parseOldSearchUrl('/search/employment-in-oakland-ca')).toEqual({
        category: 'employment',
        city: 'Oakland',
        state: 'CA',
      })
    })

    it('handles multi-word cities', () => {
      expect(parseOldSearchUrl('/search/housing-in-san-francisco-ca')).toEqual({
        category: 'housing',
        city: 'San Francisco',
        state: 'CA',
      })
    })

    it('returns null for non-matching URL', () => {
      expect(parseOldSearchUrl('/resources/something')).toBeNull()
    })

    it('returns null for missing state code', () => {
      expect(parseOldSearchUrl('/search/employment-in-oakland')).toBeNull()
    })
  })

  describe('parseOldResourceUrl', () => {
    it('parses /resources/{id} URL', () => {
      expect(parseOldResourceUrl('/resources/abc123')).toEqual({ id: 'abc123' })
    })

    it('parses /resources/{slug}/{id} URL', () => {
      expect(parseOldResourceUrl('/resources/oakland-job-center/abc123')).toEqual({ id: 'abc123' })
    })

    it('parses /resources/{state}/{city}/{slug} URL', () => {
      expect(parseOldResourceUrl('/resources/ca/oakland/oakland-job-center')).toEqual({
        slug: 'oakland-job-center',
      })
    })

    it('returns null for non-resources URL', () => {
      expect(parseOldResourceUrl('/other/path')).toBeNull()
    })

    it('returns null for bare /resources', () => {
      expect(parseOldResourceUrl('/resources')).toBeNull()
    })
  })
})
