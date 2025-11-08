import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitRating, getUserRating, deleteRating, getRatingStats } from '@/lib/api/ratings'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

describe('ratings API', () => {
  const mockSupabase = {
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  describe('submitRating', () => {
    it('validates rating is between 1 and 5', async () => {
      // Test invalid ratings
      const resultTooLow = await submitRating('user1', 'resource1', 0)
      expect(resultTooLow.error).toBeDefined()
      expect(resultTooLow.error?.message).toContain('between 1 and 5')

      const resultTooHigh = await submitRating('user1', 'resource1', 6)
      expect(resultTooHigh.error).toBeDefined()
      expect(resultTooHigh.error?.message).toContain('between 1 and 5')

      // Should not have called Supabase
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('successfully submits valid rating', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: '1', user_id: 'user1', resource_id: 'resource1', rating: 5 },
          error: null,
        }),
      })

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const result = await submitRating('user1', 'resource1', 5)

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('resource_ratings')
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'user1',
          resource_id: 'resource1',
          rating: 5,
        },
        { onConflict: 'user_id,resource_id' }
      )
    })

    it('handles database errors gracefully', async () => {
      const mockError = new Error('Database error')
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      })

      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      })

      const result = await submitRating('user1', 'resource1', 3)

      expect(result.data).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })

  describe('getUserRating', () => {
    it('returns null when user has not rated', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      })

      const rating = await getUserRating('user1', 'resource1')
      expect(rating).toBeNull()
    })

    it('returns rating when user has rated', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { rating: 4 },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      })

      const rating = await getUserRating('user1', 'resource1')
      expect(rating).toBe(4)
    })
  })

  describe('deleteRating', () => {
    it('successfully deletes rating', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: mockEq,
          }),
        }),
      })

      const result = await deleteRating('user1', 'resource1')
      expect(result.error).toBeNull()
    })
  })

  describe('getRatingStats', () => {
    it('returns rating statistics for a resource', async () => {
      const mockStats = {
        rating_average: 4.5,
        rating_count: 10,
      }

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockStats,
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await getRatingStats('resource1')
      expect(result.data).toEqual(mockStats)
      expect(result.error).toBeNull()
    })

    it('handles errors when fetching stats', async () => {
      const mockError = new Error('Database error')
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await getRatingStats('resource1')
      expect(result.data).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })
})
