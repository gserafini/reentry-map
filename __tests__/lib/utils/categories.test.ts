import { describe, it, expect } from 'vitest'
import {
  getAllCategories,
  getCategoryLabel,
  getCategoryDescription,
  CATEGORIES,
  CATEGORY_CONFIG,
} from '@/lib/utils/categories'

describe('categories', () => {
  describe('CATEGORY_CONFIG', () => {
    it('contains all 13 categories', () => {
      expect(Object.keys(CATEGORY_CONFIG)).toHaveLength(13)
    })

    it('has label and description for each category', () => {
      for (const [, config] of Object.entries(CATEGORY_CONFIG)) {
        expect(config.label).toBeTruthy()
        expect(config.description).toBeTruthy()
      }
    })
  })

  describe('getAllCategories', () => {
    it('returns array of all category keys', () => {
      const categories = getAllCategories()
      expect(categories).toContain('employment')
      expect(categories).toContain('housing')
      expect(categories).toContain('food')
      expect(categories.length).toBe(13)
    })
  })

  describe('CATEGORIES', () => {
    it('is an array of value/label objects', () => {
      expect(CATEGORIES.length).toBe(13)
      expect(CATEGORIES[0]).toHaveProperty('value')
      expect(CATEGORIES[0]).toHaveProperty('label')
    })
  })

  describe('getCategoryLabel', () => {
    it('returns label for hyphenated category', () => {
      expect(getCategoryLabel('employment')).toBe('Employment')
      expect(getCategoryLabel('mental-health')).toBe('Mental Health')
      expect(getCategoryLabel('general-support')).toBe('General Support')
    })

    it('normalizes underscore format to hyphen', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(getCategoryLabel('mental_health' as any)).toBe('Mental Health')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(getCategoryLabel('general_support' as any)).toBe('General Support')
    })

    it('returns raw category name for unknown category', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(getCategoryLabel('unknown_category' as any)).toBe('unknown_category')
    })
  })

  describe('getCategoryDescription', () => {
    it('returns description for category', () => {
      expect(getCategoryDescription('employment')).toContain('Job placement')
      expect(getCategoryDescription('housing')).toContain('shelter')
    })

    it('normalizes underscore format', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(getCategoryDescription('substance_abuse' as any)).toContain('recovery')
    })

    it('returns empty string for unknown category', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(getCategoryDescription('nonexistent' as any)).toBe('')
    })
  })
})
