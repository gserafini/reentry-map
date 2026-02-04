import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures these are available when vi.mock factories run (hoisted above imports)
const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}))

vi.mock('next-auth/react', () => ({
  getSession: () => mockGetSession(),
}))

import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'

describe('admin utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkCurrentUserIsAdmin', () => {
    it('returns true when current user is admin', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'admin-user-id', isAdmin: true },
      })

      const result = await checkCurrentUserIsAdmin()
      expect(result).toBe(true)
    })

    it('returns false when no user is logged in (security critical)', async () => {
      mockGetSession.mockResolvedValue(null)

      const result = await checkCurrentUserIsAdmin()
      expect(result).toBe(false)
    })

    it('returns false when current user is not admin', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'regular-user-id', isAdmin: false },
      })

      const result = await checkCurrentUserIsAdmin()
      expect(result).toBe(false)
    })

    it('returns false when isAdmin is undefined in session', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-id' },
      })

      const result = await checkCurrentUserIsAdmin()
      expect(result).toBe(false)
    })
  })
})
