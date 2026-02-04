import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitRating, getUserRating, deleteRating, getRatingStats } from '@/lib/api/ratings'

// Mock postgres.js sql client (vi.hoisted ensures mockSql is available when vi.mock is hoisted)
const { mockSql } = vi.hoisted(() => ({
  mockSql: vi.fn(),
}))
vi.mock('@/lib/db/client', () => ({
  sql: mockSql,
}))

describe('ratings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitRating', () => {
    it('validates rating is between 1 and 5', async () => {
      const resultTooLow = await submitRating('user1', 'resource1', 0)
      expect(resultTooLow.error).toBeDefined()
      expect(resultTooLow.error?.message).toContain('between 1 and 5')

      const resultTooHigh = await submitRating('user1', 'resource1', 6)
      expect(resultTooHigh.error).toBeDefined()
      expect(resultTooHigh.error?.message).toContain('between 1 and 5')

      // Should not have called database
      expect(mockSql).not.toHaveBeenCalled()
    })

    it('successfully submits valid rating', async () => {
      mockSql.mockResolvedValue([
        { id: '1', user_id: 'user1', resource_id: 'resource1', rating: 5 },
      ])

      const result = await submitRating('user1', 'resource1', 5)

      expect(result.data).toBeDefined()
      expect(result.data?.rating).toBe(5)
      expect(result.error).toBeNull()
      expect(mockSql).toHaveBeenCalled()
    })

    it('handles database errors gracefully', async () => {
      mockSql.mockRejectedValue(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await submitRating('user1', 'resource1', 3)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Database error')

      consoleSpy.mockRestore()
    })
  })

  describe('getUserRating', () => {
    it('returns null when user has not rated', async () => {
      mockSql.mockResolvedValue([])

      const rating = await getUserRating('user1', 'resource1')
      expect(rating).toBeNull()
    })

    it('returns rating when user has rated', async () => {
      mockSql.mockResolvedValue([{ rating: 4 }])

      const rating = await getUserRating('user1', 'resource1')
      expect(rating).toBe(4)
    })
  })

  describe('deleteRating', () => {
    it('successfully deletes rating', async () => {
      mockSql.mockResolvedValue([])

      const result = await deleteRating('user1', 'resource1')
      expect(result.error).toBeNull()
    })

    it('handles database errors', async () => {
      mockSql.mockRejectedValue(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await deleteRating('user1', 'resource1')
      expect(result.error).toBeInstanceOf(Error)

      consoleSpy.mockRestore()
    })
  })

  describe('getRatingStats', () => {
    it('returns rating statistics for a resource', async () => {
      const mockStats = { rating_average: 4.5, rating_count: 10 }
      mockSql.mockResolvedValue([mockStats])

      const result = await getRatingStats('resource1')
      expect(result.data).toEqual(mockStats)
      expect(result.error).toBeNull()
    })

    it('returns error when resource not found', async () => {
      mockSql.mockResolvedValue([])

      const result = await getRatingStats('nonexistent')
      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Resource not found')
    })

    it('handles errors when fetching stats', async () => {
      mockSql.mockRejectedValue(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await getRatingStats('resource1')
      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)

      consoleSpy.mockRestore()
    })
  })
})
