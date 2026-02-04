import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  toggleFavorite,
  isFavorited,
  addFavorite,
  removeFavorite,
  getFavoriteCount,
} from '@/lib/api/favorites'

// Mock postgres.js sql client (vi.hoisted ensures mockSql is available when vi.mock is hoisted)
const { mockSql } = vi.hoisted(() => ({
  mockSql: vi.fn(),
}))
vi.mock('@/lib/db/client', () => ({
  sql: mockSql,
}))

describe('favorites API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('toggleFavorite - complex business logic', () => {
    it('adds favorite when resource is not favorited', async () => {
      // First call: isFavorited check returns empty (not favorited)
      // Second call: addFavorite INSERT returns new record
      mockSql
        .mockResolvedValueOnce([]) // isFavorited: empty = not favorited
        .mockResolvedValueOnce([{ id: '1', user_id: 'user1', resource_id: 'res1' }]) // addFavorite

      const result = await toggleFavorite('user1', 'res1')

      expect(result.error).toBeNull()
      expect(mockSql).toHaveBeenCalledTimes(2)
    })

    it('removes favorite when resource is already favorited', async () => {
      // First call: isFavorited check returns a record (is favorited)
      // Second call: removeFavorite DELETE
      mockSql
        .mockResolvedValueOnce([{ id: '1' }]) // isFavorited: found = favorited
        .mockResolvedValueOnce([]) // removeFavorite

      const result = await toggleFavorite('user1', 'res1')

      expect(result.error).toBeNull()
      expect(mockSql).toHaveBeenCalledTimes(2)
    })
  })

  describe('isFavorited', () => {
    it('returns true when resource is favorited', async () => {
      mockSql.mockResolvedValue([{ id: '1' }])

      const result = await isFavorited('user1', 'res1')
      expect(result).toBe(true)
    })

    it('returns false when resource is not favorited', async () => {
      mockSql.mockResolvedValue([])

      const result = await isFavorited('user1', 'res1')
      expect(result).toBe(false)
    })

    it('returns false when database error occurs', async () => {
      mockSql.mockRejectedValue(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await isFavorited('user1', 'res1')
      expect(result).toBe(false)

      consoleSpy.mockRestore()
    })
  })

  describe('addFavorite', () => {
    it('successfully adds favorite with optional notes', async () => {
      mockSql.mockResolvedValue([
        { id: '1', user_id: 'user1', resource_id: 'res1', notes: 'Great place!' },
      ])

      const result = await addFavorite('user1', 'res1', 'Great place!')

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })

    it('handles database errors when adding favorite', async () => {
      mockSql.mockRejectedValue(new Error('Duplicate key violation'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await addFavorite('user1', 'res1')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)

      consoleSpy.mockRestore()
    })
  })

  describe('removeFavorite', () => {
    it('successfully removes favorite', async () => {
      mockSql.mockResolvedValue([])

      const result = await removeFavorite('user1', 'res1')
      expect(result.error).toBeNull()
    })

    it('handles errors when removing favorite', async () => {
      mockSql.mockRejectedValue(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await removeFavorite('user1', 'res1')
      expect(result.error).toBeInstanceOf(Error)

      consoleSpy.mockRestore()
    })
  })

  describe('getFavoriteCount', () => {
    it('returns count of favorites for a resource', async () => {
      mockSql.mockResolvedValue([{ count: '42' }])

      const count = await getFavoriteCount('res1')
      expect(count).toBe(42)
    })

    it('returns 0 when error occurs', async () => {
      mockSql.mockRejectedValue(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const count = await getFavoriteCount('res1')
      expect(count).toBe(0)

      consoleSpy.mockRestore()
    })

    it('returns 0 when count is zero', async () => {
      mockSql.mockResolvedValue([{ count: '0' }])

      const count = await getFavoriteCount('res1')
      expect(count).toBe(0)
    })
  })
})
