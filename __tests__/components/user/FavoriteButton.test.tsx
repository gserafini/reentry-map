import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock useAuth hook
const mockUseAuth = vi.fn()
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock useFavorites context
const mockIsFavorited = vi.fn()
const mockToggleFavorite = vi.fn()
const mockUseFavorites = vi.fn()
vi.mock('@/lib/context/FavoritesContext', () => ({
  useFavorites: () => mockUseFavorites(),
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
    mockIsFavorited.mockReturnValue(false)
    mockToggleFavorite.mockResolvedValue(true)
    mockUseFavorites.mockReturnValue({
      favoriteIds: new Set(),
      isFavorited: mockIsFavorited,
      toggleFavorite: mockToggleFavorite,
      isLoading: false,
    })
  })

  it('renders loading spinner while favorites are loading', { timeout: 15000 }, () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })
    mockUseFavorites.mockReturnValue({
      favoriteIds: new Set(),
      isFavorited: mockIsFavorited,
      toggleFavorite: mockToggleFavorite,
      isLoading: true,
    })

    render(<FavoriteButton resourceId="res-1" />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('renders unfilled heart when not favorited', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<FavoriteButton resourceId="res-1" />)

    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
    expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
  })

  it('renders filled heart when favorited', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })
    mockIsFavorited.mockReturnValue(true)

    render(<FavoriteButton resourceId="res-1" />)

    expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument()
  })

  it('redirects to login when unauthenticated user clicks', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<FavoriteButton resourceId="res-1" />)

    fireEvent.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith('/auth/login')
  })

  it('calls showAuthModal if provided instead of redirecting', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    const mockShowAuth = vi.fn()
    render(<FavoriteButton resourceId="res-1" showAuthModal={mockShowAuth} />)

    fireEvent.click(screen.getByRole('button'))
    expect(mockShowAuth).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('calls toggleFavorite from context when clicking', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    render(<FavoriteButton resourceId="res-1" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(mockToggleFavorite).toHaveBeenCalledWith('res-1')
  })

  it('shows loading state while toggle is in progress', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    // Make toggleFavorite take time to resolve
    let resolveToggle: (value: boolean) => void
    mockToggleFavorite.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveToggle = resolve
      })
    )

    render(<FavoriteButton resourceId="res-1" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    // Button should be disabled during toggle
    expect(screen.getByRole('button')).toBeDisabled()

    // Resolve the toggle
    await act(async () => {
      resolveToggle!(true)
    })

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  it('handles different sizes', { timeout: 15000 }, () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    const { rerender } = render(<FavoriteButton resourceId="res-1" size="small" />)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<FavoriteButton resourceId="res-1" size="large" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('does not call toggleFavorite when already loading', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    // Make toggleFavorite never resolve
    mockToggleFavorite.mockReturnValue(new Promise(() => {}))

    render(<FavoriteButton resourceId="res-1" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    // Click again while loading
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    // Should only have been called once
    expect(mockToggleFavorite).toHaveBeenCalledTimes(1)
  })
})
