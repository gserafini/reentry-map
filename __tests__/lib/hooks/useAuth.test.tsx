import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAuth } from '@/lib/hooks/useAuth'
import type { User } from '@supabase/supabase-js'

// Mock Next.js router
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock Supabase client
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}))

describe('useAuth', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    role: 'authenticated',
  } as User

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no subscription cleanup needed
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  it('starts with loading state', () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('loads authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('handles no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('handles getUser error', async () => {
    mockGetUser.mockRejectedValue(new Error('Auth error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching user:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('listens to auth state changes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const authCallback = vi.fn()
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback.mockImplementation(callback)
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Simulate auth state change (user signs in)
    act(() => {
      authCallback('SIGNED_IN', { user: mockUser })
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  it('signs out user and redirects', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockSignOut.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Sign out
    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockRefresh).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
    expect(result.current.user).toBeNull()
  })

  it('handles sign out error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockSignOut.mockRejectedValue(new Error('Sign out error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Attempt sign out
    await act(async () => {
      await result.current.signOut()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error signing out:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('refreshes user data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Change mock to return updated user
    const updatedUser = { ...mockUser, email: 'updated@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: updatedUser }, error: null })

    // Refresh user
    await act(async () => {
      await result.current.refreshUser()
    })

    expect(result.current.user?.email).toBe('updated@example.com')
  })

  it('handles refresh user error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Make next getUser call fail
    mockGetUser.mockRejectedValue(new Error('Refresh error'))

    // Attempt refresh
    await act(async () => {
      await result.current.refreshUser()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error refreshing user:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('unsubscribes from auth changes on unmount', () => {
    const unsubscribeMock = vi.fn()
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } },
    })

    const { unmount } = renderHook(() => useAuth())

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
  })
})
