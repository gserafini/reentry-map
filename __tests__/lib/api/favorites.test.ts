import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  toggleFavorite,
  isFavorited,
  addFavorite,
  removeFavorite,
  getFavoriteCount,
} from '@/lib/api/favorites'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

describe('favorites API', () => {
  const mockSupabase = {
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  describe('toggleFavorite - complex business logic', () => {
    it('adds favorite when resource is not favorited', async () => {
      // First call to check if favorited (returns false)
      const mockCheckSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      })

      // Second call to add favorite
      const mockAddSingle = vi.fn().mockResolvedValue({
        data: { id: '1', user_id: 'user1', resource_id: 'res1' },
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call: check if favorited
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockCheckSingle,
                }),
              }),
            }),
          }
        } else {
          // Second call: add favorite
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: mockAddSingle,
              }),
            }),
          }
        }
      })

      const result = await toggleFavorite('user1', 'res1')

      expect(result.error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledTimes(2)
    })

    it('removes favorite when resource is already favorited', async () => {
      // First call to check if favorited (returns true)
      const mockCheckSingle = vi.fn().mockResolvedValue({
        data: { id: '1' },
        error: null,
      })

      // Second call to remove favorite
      const mockDeleteEq = vi.fn().mockResolvedValue({
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call: check if favorited
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockCheckSingle,
                }),
              }),
            }),
          }
        } else {
          // Second call: remove favorite
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: mockDeleteEq,
              }),
            }),
          }
        }
      })

      const result = await toggleFavorite('user1', 'res1')

      expect(result.error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledTimes(2)
    })
  })

  describe('isFavorited', () => {
    it('returns true when resource is favorited', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: '1' },
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

      const result = await isFavorited('user1', 'res1')
      expect(result).toBe(true)
    })

    it('returns false when resource is not favorited', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error code
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

      const result = await isFavorited('user1', 'res1')
      expect(result).toBe(false)
    })

    it('returns false when database error occurs', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Something went wrong' },
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

      const result = await isFavorited('user1', 'res1')
      // Should default to false on error
      expect(result).toBe(false)
    })
  })

  describe('addFavorite', () => {
    it('successfully adds favorite with optional notes', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: '1', user_id: 'user1', resource_id: 'res1', notes: 'Great place!' },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await addFavorite('user1', 'res1', 'Great place!')

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })

    it('handles database errors when adding favorite', async () => {
      const mockError = new Error('Duplicate key violation')
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      })

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await addFavorite('user1', 'res1')

      expect(result.data).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })

  describe('removeFavorite', () => {
    it('successfully removes favorite', async () => {
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

      const result = await removeFavorite('user1', 'res1')
      expect(result.error).toBeNull()
    })

    it('handles errors when removing favorite', async () => {
      const mockError = new Error('Database error')
      const mockEq = vi.fn().mockResolvedValue({
        error: mockError,
      })

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: mockEq,
          }),
        }),
      })

      const result = await removeFavorite('user1', 'res1')
      expect(result.error).toBe(mockError)
    })
  })

  describe('getFavoriteCount', () => {
    it('returns count of favorites for a resource', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 42,
            error: null,
          }),
        }),
      })

      const count = await getFavoriteCount('res1')
      expect(count).toBe(42)
    })

    it('returns 0 when error occurs', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: null,
            error: new Error('Database error'),
          }),
        }),
      })

      const count = await getFavoriteCount('res1')
      // Should default to 0 on error
      expect(count).toBe(0)
    })

    it('returns 0 when count is null', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: null,
            error: null,
          }),
        }),
      })

      const count = await getFavoriteCount('res1')
      expect(count).toBe(0)
    })
  })
})
