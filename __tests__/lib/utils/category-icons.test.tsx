import { describe, it, expect } from 'vitest'
import {
  getCategoryIcon,
  getCategoryColor,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
} from '@/lib/utils/category-icons'
import type { ResourceCategory } from '@/lib/types/database'

describe('category-icons', () => {
  describe('getCategoryIcon', () => {
    it('returns correct icon for hyphenated category', () => {
      const icon = getCategoryIcon('employment')
      expect(icon).toBe(CATEGORY_ICONS['employment'])
    })

    it('normalizes underscore format to hyphen format', () => {
      // "general_support" should be normalized to "general-support"
      const icon = getCategoryIcon('general_support' as ResourceCategory)
      expect(icon).toBe(CATEGORY_ICONS['general-support'])
    })

    it('normalizes mental_health to mental-health', () => {
      const icon = getCategoryIcon('mental_health' as ResourceCategory)
      expect(icon).toBe(CATEGORY_ICONS['mental-health'])
    })

    it('falls back to GeneralSupportIcon for unknown category', () => {
      const fallbackIcon = CATEGORY_ICONS['general-support']
      const icon = getCategoryIcon('nonexistent_category' as ResourceCategory)
      expect(icon).toBe(fallbackIcon)
    })

    it('returns icon for each defined category', () => {
      const categories: ResourceCategory[] = [
        'employment',
        'housing',
        'food',
        'healthcare',
        'clothing',
        'legal-aid',
        'transportation',
        'education',
        'mental-health',
        'substance-abuse',
        'id-documents',
        'faith-based',
        'general-support',
      ]

      for (const category of categories) {
        expect(getCategoryIcon(category)).toBe(CATEGORY_ICONS[category])
      }
    })
  })

  describe('getCategoryColor', () => {
    it('returns correct color for valid category', () => {
      expect(getCategoryColor('employment')).toBe('#1976d2')
    })

    it('normalizes underscore format', () => {
      expect(getCategoryColor('legal_aid' as ResourceCategory)).toBe(CATEGORY_COLORS['legal-aid'])
    })

    it('falls back to grey for unknown category', () => {
      expect(getCategoryColor('unknown_category' as ResourceCategory)).toBe('#616161')
    })

    it('returns correct color for each defined category', () => {
      expect(getCategoryColor('housing')).toBe('#388e3c')
      expect(getCategoryColor('food')).toBe('#f57c00')
      expect(getCategoryColor('healthcare')).toBe('#d32f2f')
    })
  })
})
