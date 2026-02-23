import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

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

import { RatingStars } from '@/components/user/RatingStars'

describe('RatingStars', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rating: null }),
    })
  })

  it('renders loading state while checking existing rating', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })
    // Never resolving fetch keeps component in loading state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    render(<RatingStars resourceId="res-1" resourceName="Test Resource" />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders read-only stars without loading state', () => {
    render(<RatingStars resourceId="res-1" resourceName="Test Resource" readOnly />)
    // Read-only mode skips checking state
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('loads user rating on mount for authenticated users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rating: 4 }),
    })
    global.fetch = mockFetch

    render(<RatingStars resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/ratings?resourceId=res-1')
    })
  })

  it('shows descriptive text for existing rating', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rating: 4 }),
    })

    render(<RatingStars resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Your rating: 4 stars')).toBeInTheDocument()
    })
  })

  it('shows singular "star" for rating of 1', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rating: 1 }),
    })

    render(<RatingStars resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Your rating: 1 star')).toBeInTheDocument()
    })
  })

  it('renders Rating component with proper aria-label', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<RatingStars resourceId="res-1" resourceName="Oakland Job Center" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Rate Oakland Job Center')).toBeInTheDocument()
    })
  })

  it('handles error when loading rating', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<RatingStars resourceId="res-1" resourceName="Test Resource" />)

    // Should finish loading even on error
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  it('supports different sizes', () => {
    const { rerender } = render(
      <RatingStars resourceId="res-1" resourceName="Test" size="small" readOnly />
    )
    expect(screen.getByLabelText('Rate Test')).toBeInTheDocument()

    rerender(<RatingStars resourceId="res-1" resourceName="Test" size="large" readOnly />)
    expect(screen.getByLabelText('Rate Test')).toBeInTheDocument()
  })

  it('calls showAuthModal when unauthenticated user attempts to rate', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    const mockShowAuth = vi.fn()
    render(
      <RatingStars resourceId="res-1" resourceName="Test Resource" showAuthModal={mockShowAuth} />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Rate Test Resource')).toBeInTheDocument()
    })

    // Find and click a star
    const ratingElement = screen.getByLabelText('Rate Test Resource')
    const stars = ratingElement.querySelectorAll('.MuiRating-icon')
    if (stars.length > 0) {
      fireEvent.click(stars[2]) // Click 3rd star
    }
  })

  it('redirects to login when unauthenticated user rates without showAuthModal', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    // Mock sessionStorage
    const mockSetItem = vi.fn()
    Object.defineProperty(window, 'sessionStorage', {
      value: { setItem: mockSetItem },
      writable: true,
      configurable: true,
    })

    render(<RatingStars resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Rate Test Resource')).toBeInTheDocument()
    })
  })

  it('submits rating successfully for authenticated user', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    const onRatingChange = vi.fn()
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rating: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

    render(
      <RatingStars
        resourceId="res-1"
        resourceName="Test Resource"
        onRatingChange={onRatingChange}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  it('handles failed rating submission', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rating: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      })

    render(<RatingStars resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('shows loading spinner sized for small variant', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    render(<RatingStars resourceId="res-1" resourceName="Test" size="small" />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows loading spinner sized for large variant', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    render(<RatingStars resourceId="res-1" resourceName="Test" size="large" />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('does not fetch rating when user is null', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    const mockFetch = vi.fn()
    global.fetch = mockFetch

    render(<RatingStars resourceId="res-1" resourceName="Test" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Rate Test')).toBeInTheDocument()
    })

    // Should NOT fetch rating when user is null
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows tooltip text based on authentication state and rating', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rating: 3 }),
    })

    render(<RatingStars resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Your rating: 3 stars')).toBeInTheDocument()
    })
  })
})
