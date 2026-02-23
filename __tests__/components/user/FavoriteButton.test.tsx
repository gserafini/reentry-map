import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock useAuth hook
const mockUseAuth = vi.fn()
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}))

import { FavoriteButton } from '@/components/user/FavoriteButton'

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isFavorited: false }),
    })
  })

  it('renders loading spinner while checking initial state', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })
    // fetch never resolves, so checking stays true
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    render(<FavoriteButton resourceId="res-1" />)
    // Should show disabled button with spinner while checking
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('renders unfilled heart when not favorited', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<FavoriteButton resourceId="res-1" />)

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
  })

  it('checks favorite status on mount for authenticated users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isFavorited: true }),
    })
    global.fetch = mockFetch

    render(<FavoriteButton resourceId="res-1" />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/favorites/check?resourceId=res-1')
    })
  })

  it('redirects to login when unauthenticated user clicks', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<FavoriteButton resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith('/auth/login')
  })

  it('calls showAuthModal if provided instead of redirecting', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    const mockShowAuth = vi.fn()
    render(<FavoriteButton resourceId="res-1" showAuthModal={mockShowAuth} />)

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button'))
    expect(mockShowAuth).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('sends POST to add favorite when not favorited', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: false }),
      })
      .mockResolvedValueOnce({ ok: true })

    global.fetch = mockFetch

    render(<FavoriteButton resourceId="res-1" />)

    // Wait for initial check to complete
    await waitFor(() => {
      expect(screen.getByLabelText('Add to favorites')).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId: 'res-1' }),
    })
  })

  it('sends DELETE to remove favorite when already favorited', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: true }),
      })
      .mockResolvedValueOnce({ ok: true })

    global.fetch = mockFetch

    render(<FavoriteButton resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Remove from favorites')).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId: 'res-1' }),
    })
  })

  it('reverts optimistic update on API error', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: false }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      })

    global.fetch = mockFetch

    render(<FavoriteButton resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Add to favorites')).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    // After error, should revert back to unfavorited
    await waitFor(() => {
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
    })
  })

  it('reverts optimistic update on fetch exception', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFavorited: false }),
      })
      .mockRejectedValueOnce(new Error('Network error'))

    global.fetch = mockFetch

    render(<FavoriteButton resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Add to favorites')).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
    })
  })

  it('handles different sizes', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    const { rerender } = render(<FavoriteButton resourceId="res-1" size="small" />)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<FavoriteButton resourceId="res-1" size="large" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('handles error when checking initial favorite status', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<FavoriteButton resourceId="res-1" />)

    await waitFor(() => {
      // Should finish checking even on error (defaults to unfavorited)
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
    })
  })
})
