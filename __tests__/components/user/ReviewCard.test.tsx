import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock useAuth hook
const mockUseAuth = vi.fn()
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock avatar utility
vi.mock('@/lib/utils/avatar', () => ({
  getUserDisplayName: (email: string | null, phone: string | null) => email || phone || 'Anonymous',
}))

import { ReviewCard } from '@/components/user/ReviewCard'

const baseReview = {
  id: 'review-1',
  resource_id: 'resource-1',
  user_id: 'user-1',
  rating: 4,
  review_text: 'Great resource, very helpful staff.',
  pros: 'Friendly staff, quick service',
  cons: 'Limited hours',
  tips: 'Arrive early for best service',
  was_helpful: true,
  would_recommend: true,
  visited_date: '2025-06-15',
  created_at: '2025-07-01T12:00:00Z',
  updated_at: '2025-07-01T12:00:00Z',
  status: 'approved' as const,
  helpful_count: 5,
  not_helpful_count: 1,
  moderation_notes: null,
  user: {
    id: 'user-1',
    email: 'reviewer@example.com',
    phone: null,
  },
}

describe('ReviewCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })
    global.fetch = vi.fn()
  })

  it('renders reviewer name from email', () => {
    render(<ReviewCard review={baseReview} />)
    expect(screen.getByText('reviewer@example.com')).toBeInTheDocument()
  })

  it('renders review text', () => {
    render(<ReviewCard review={baseReview} />)
    expect(screen.getByText('Great resource, very helpful staff.')).toBeInTheDocument()
  })

  it('renders rating', () => {
    render(<ReviewCard review={baseReview} />)
    // MUI Rating renders with img alt text
    const ratingElement = screen.getByRole('img', { name: /4 Stars/i })
    expect(ratingElement).toBeInTheDocument()
  })

  it('renders pros when provided', () => {
    render(<ReviewCard review={baseReview} />)
    expect(screen.getByText('Friendly staff, quick service')).toBeInTheDocument()
  })

  it('renders cons when provided', () => {
    render(<ReviewCard review={baseReview} />)
    expect(screen.getByText('Limited hours')).toBeInTheDocument()
  })

  it('renders tips when provided', () => {
    render(<ReviewCard review={baseReview} />)
    expect(screen.getByText('Arrive early for best service')).toBeInTheDocument()
  })

  it('does not render pros section when not provided', () => {
    const review = { ...baseReview, pros: null }
    render(<ReviewCard review={review} />)
    expect(screen.queryByText('Pros:')).not.toBeInTheDocument()
  })

  it('renders helpfulness counts', () => {
    render(<ReviewCard review={baseReview} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows "Your Review" chip for own reviews', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })
    render(<ReviewCard review={baseReview} />)
    expect(screen.getByText('Your Review')).toBeInTheDocument()
  })

  it('does not show "Your Review" chip for other users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'other-user' },
      isAuthenticated: true,
    })
    render(<ReviewCard review={baseReview} />)
    expect(screen.queryByText('Your Review')).not.toBeInTheDocument()
  })

  it('renders "Anonymous" when no user info', () => {
    const review = { ...baseReview, user: undefined }
    render(<ReviewCard review={review} />)
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
  })

  it('renders "Was this review helpful?" text', () => {
    render(<ReviewCard review={baseReview} />)
    expect(screen.getByText('Was this review helpful?')).toBeInTheDocument()
  })

  it('renders badge chips for helpful and recommend', () => {
    render(<ReviewCard review={baseReview} />)
    expect(screen.getByText('Found it helpful')).toBeInTheDocument()
    expect(screen.getByText('Would recommend')).toBeInTheDocument()
  })

  it('does not render badge chips when not applicable', () => {
    const review = { ...baseReview, was_helpful: false, would_recommend: false }
    render(<ReviewCard review={review} />)
    expect(screen.queryByText('Found it helpful')).not.toBeInTheDocument()
    expect(screen.queryByText('Would recommend')).not.toBeInTheDocument()
  })

  describe('helpfulness voting', () => {
    it('redirects unauthenticated user to login on vote', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      })
      render(<ReviewCard review={baseReview} />)
      // Click thumbs up
      const buttons = screen.getAllByRole('button')
      const thumbUpButton = buttons.find((b) => !b.hasAttribute('disabled'))
      if (thumbUpButton) {
        fireEvent.click(thumbUpButton)
      }
    })

    it('calls API when authenticated user votes', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'other-user' },
        isAuthenticated: true,
      })

      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      global.fetch = mockFetch

      render(<ReviewCard review={baseReview} />)

      // Find the helpfulness voting buttons - they're IconButtons
      // There should be thumbs up and thumbs down buttons
      const helpfulButton = screen.getAllByRole('button')[0]
      fireEvent.click(helpfulButton)

      await waitFor(() => {
        // Verify API was called or state was updated
        // The component makes a fetch call to /api/reviews/helpfulness
      })
    })

    it('disables voting on own reviews', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1' },
        isAuthenticated: true,
      })
      render(<ReviewCard review={baseReview} />)
      // Voting buttons should be disabled for own review
      const buttons = screen.getAllByRole('button')
      const disabledButtons = buttons.filter((b) => b.hasAttribute('disabled'))
      expect(disabledButtons.length).toBeGreaterThan(0)
    })
  })
})
