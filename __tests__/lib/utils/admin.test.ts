import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAdmin, checkCurrentUserIsAdmin } from '@/lib/utils/admin'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

describe('admin utilities', () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  describe('isAdmin', () => {
    it('returns true for admin users', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { is_admin: true },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await isAdmin('admin-user-id')
      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('returns false for non-admin users', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { is_admin: false },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await isAdmin('regular-user-id')
      expect(result).toBe(false)
    })

    it('returns false when database error occurs (fail-safe)', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await isAdmin('user-id')
      // Should default to false for security
      expect(result).toBe(false)
    })

    it('returns false when is_admin field is null', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { is_admin: null },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await isAdmin('user-id')
      expect(result).toBe(false)
    })
  })

  describe('checkCurrentUserIsAdmin', () => {
    it('returns true when current user is admin', async () => {
      // Mock getUser to return a user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
      })

      // Mock database call to return admin status
      const mockSingle = vi.fn().mockResolvedValue({
        data: { is_admin: true },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await checkCurrentUserIsAdmin()
      expect(result).toBe(true)
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    it('returns false when no user is logged in (security critical)', async () => {
      // Mock getUser to return no user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const result = await checkCurrentUserIsAdmin()
      // Should not call database if no user
      expect(result).toBe(false)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('returns false when current user is not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'regular-user-id' } },
      })

      const mockSingle = vi.fn().mockResolvedValue({
        data: { is_admin: false },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await checkCurrentUserIsAdmin()
      expect(result).toBe(false)
    })
  })
})
