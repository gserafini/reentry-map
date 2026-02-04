import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/lib/hooks/useAuth'

// Mock Next.js router
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock NextAuth
const mockUseSession = vi.fn()
const mockSignOut = vi.fn()
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

// Mock analytics
vi.mock('@/lib/analytics/queue', () => ({
  identifyUser: vi.fn(),
  clearUser: vi.fn(),
}))

describe('useAuth', () => {
  const mockSessionUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    phone: '+15551234567',
    name: 'Test User',
    image: null,
    isAdmin: false,
    created_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock localStorage
    const store: Record<string, string> = {}
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      store[key] = value
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete store[key]
    })
  })

  it('starts with loading state', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('loads authenticated user', () => {
    mockUseSession.mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.user).toEqual(mockSessionUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('handles no authenticated user', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('exposes isAdmin from session', () => {
    mockUseSession.mockReturnValue({
      data: { user: { ...mockSessionUser, isAdmin: true } },
      status: 'authenticated',
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAdmin).toBe(true)
  })

  it('defaults isAdmin to false when not set', () => {
    mockUseSession.mockReturnValue({
      data: { user: { ...mockSessionUser, isAdmin: undefined } },
      status: 'authenticated',
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAdmin).toBe(false)
  })

  it('signs out user and redirects', async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    })
    mockSignOut.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false })
    expect(mockRefresh).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('handles sign out error', async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    })
    mockSignOut.mockRejectedValue(new Error('Sign out error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signOut()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error signing out:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('refreshes via router refresh', async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.refreshUser()
    })

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('returns null user when session has no user', () => {
    mockUseSession.mockReturnValue({ data: { user: null }, status: 'unauthenticated' })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('provides correct user fields from NextAuth session', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          phone: '+15551234567',
          name: 'Test User',
          image: '/avatar.jpg',
          isAdmin: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      },
      status: 'authenticated',
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user?.id).toBe('user-123')
    expect(result.current.user?.email).toBe('user@example.com')
    expect(result.current.user?.phone).toBe('+15551234567')
    expect(result.current.user?.name).toBe('Test User')
    expect(result.current.user?.image).toBe('/avatar.jpg')
    expect(result.current.user?.isAdmin).toBe(true)
  })
})
