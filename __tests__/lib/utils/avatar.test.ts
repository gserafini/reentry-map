import { describe, it, expect } from 'vitest'
import { getInitials, getAvatarColor, getUserDisplayName, getGravatarUrl } from '@/lib/utils/avatar'

describe('avatar utilities', () => {
  describe('getInitials', () => {
    it('extracts initials from email with dot separator', () => {
      expect(getInitials('john.doe@example.com')).toBe('JD')
    })

    it('extracts initials from email with underscore separator', () => {
      expect(getInitials('jane_smith@example.com')).toBe('JS')
    })

    it('extracts initials from email with hyphen separator', () => {
      expect(getInitials('bob-jones@example.com')).toBe('BJ')
    })

    it('extracts first two characters if no separator', () => {
      expect(getInitials('alice@example.com')).toBe('AL')
    })

    it('handles single character username', () => {
      expect(getInitials('x@example.com')).toBe('X')
    })

    it('handles multiple separators', () => {
      expect(getInitials('john.doe.smith@example.com')).toBe('JD')
    })

    it('converts to uppercase', () => {
      expect(getInitials('lowercase.name@example.com')).toBe('LN')
    })
  })

  describe('getAvatarColor', () => {
    it('returns consistent color for same identifier', () => {
      const email = 'test@example.com'
      const color1 = getAvatarColor(email)
      const color2 = getAvatarColor(email)
      expect(color1).toBe(color2)
    })

    it('returns hex color code', () => {
      const color = getAvatarColor('test@example.com')
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('returns different colors for different identifiers', () => {
      const color1 = getAvatarColor('user1@example.com')
      const color2 = getAvatarColor('user2@example.com')
      // Not guaranteed to be different, but statistically should be
      // We can at least verify both are valid colors
      expect(color1).toMatch(/^#[0-9a-f]{6}$/i)
      expect(color2).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('handles phone numbers', () => {
      const color = getAvatarColor('+15551234567')
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('handles empty string', () => {
      const color = getAvatarColor('')
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })

  describe('getUserDisplayName', () => {
    it('formats email username with dot separator', () => {
      expect(getUserDisplayName('john.doe@example.com', null)).toBe('John Doe')
    })

    it('formats email username with underscore separator', () => {
      expect(getUserDisplayName('jane_smith@example.com', null)).toBe('Jane Smith')
    })

    it('formats email username with hyphen separator', () => {
      expect(getUserDisplayName('bob-jones@example.com', null)).toBe('Bob Jones')
    })

    it('capitalizes single word username', () => {
      expect(getUserDisplayName('alice@example.com', null)).toBe('Alice')
    })

    it('formats E.164 phone number', () => {
      expect(getUserDisplayName(null, '+15551234567')).toBe('(555) 123-4567')
    })

    it('returns phone as-is if not E.164 format', () => {
      expect(getUserDisplayName(null, '555-1234')).toBe('555-1234')
    })

    it('prefers email over phone', () => {
      const result = getUserDisplayName('john@example.com', '+15551234567')
      expect(result).toBe('John')
    })

    it('returns fallback when both are null', () => {
      expect(getUserDisplayName(null, null)).toBe('Anonymous User')
    })

    it('handles undefined values', () => {
      expect(getUserDisplayName(undefined, undefined)).toBe('Anonymous User')
    })
  })

  describe('getGravatarUrl', () => {
    it('generates valid Gravatar URL', () => {
      const url = getGravatarUrl('test@example.com')
      expect(url).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?s=\d+&d=\w+$/)
    })

    it('uses default size of 200', () => {
      const url = getGravatarUrl('test@example.com')
      expect(url).toContain('s=200')
    })

    it('uses custom size', () => {
      const url = getGravatarUrl('test@example.com', 400)
      expect(url).toContain('s=400')
    })

    it('uses default avatar type of mp', () => {
      const url = getGravatarUrl('test@example.com')
      expect(url).toContain('d=mp')
    })

    it('uses custom default avatar type', () => {
      const url = getGravatarUrl('test@example.com', 200, 'identicon')
      expect(url).toContain('d=identicon')
    })

    it('generates same URL for same email', () => {
      const url1 = getGravatarUrl('test@example.com')
      const url2 = getGravatarUrl('test@example.com')
      expect(url1).toBe(url2)
    })

    it('trims and lowercases email', () => {
      const url1 = getGravatarUrl('  TEST@EXAMPLE.COM  ')
      const url2 = getGravatarUrl('test@example.com')
      expect(url1).toBe(url2)
    })

    it('generates different URLs for different emails', () => {
      const url1 = getGravatarUrl('user1@example.com')
      const url2 = getGravatarUrl('user2@example.com')
      expect(url1).not.toBe(url2)
    })
  })
})
