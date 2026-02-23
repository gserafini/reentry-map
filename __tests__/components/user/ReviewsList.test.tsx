import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Mock useAuth hook
const mockUseAuth = vi.fn()
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock avatar utility
vi.mock('@/lib/utils/avatar', () => ({
  getUserDisplayName: (email: string | null, phone: string | null) => email || phone || 'Anonymous',
}))

import { ReviewsList } from '@/components/user/ReviewsList'

const sampleReviews = [
  {
    id: 'review-1',
    resource_id: 'res-1',
    user_id: 'user-1',
    rating: 5,
    review_text: 'Excellent resource!',
    pros: 'Great staff',
    cons: null,
    tips: null,
    was_helpful: true,
    would_recommend: true,
    visited_date: null,
    created_at: '2025-07-01T12:00:00Z',
    updated_at: '2025-07-01T12:00:00Z',
    status: 'approved' as const,
    helpful_count: 10,
    not_helpful_count: 0,
    moderation_notes: null,
    user: { id: 'user-1', email: 'reviewer1@example.com', phone: null },
  },
  {
    id: 'review-2',
    resource_id: 'res-1',
    user_id: 'user-2',
    rating: 3,
    review_text: 'Average experience.',
    pros: null,
    cons: 'Long wait',
    tips: 'Come early',
    was_helpful: false,
    would_recommend: false,
    visited_date: null,
    created_at: '2025-06-15T12:00:00Z',
    updated_at: '2025-06-15T12:00:00Z',
    status: 'approved' as const,
    helpful_count: 2,
    not_helpful_count: 3,
    moderation_notes: null,
    user: { id: 'user-2', email: 'reviewer2@example.com', phone: null },
  },
]

describe('ReviewsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })
  })

  it('shows loading spinner while fetching reviews', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    render(<ReviewsList resourceId="res-1" />)
    // CircularProgress should be present (loading state)
    expect(screen.queryByText('No reviews yet')).not.toBeInTheDocument()
    expect(screen.queryByText('Reviews')).not.toBeInTheDocument()
  })

  it('shows empty state when no reviews', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    })

    expect(
      screen.getByText('Be the first to share your experience with this resource')
    ).toBeInTheDocument()
  })

  it('shows "Write a Review" button in empty state when callback provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    })

    const onWriteReviewClick = vi.fn()
    render(<ReviewsList resourceId="res-1" onWriteReviewClick={onWriteReviewClick} />)

    await waitFor(() => {
      expect(screen.getByText('Write a Review')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Write a Review'))
    expect(onWriteReviewClick).toHaveBeenCalled()
  })

  it('renders reviews when data is available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: sampleReviews }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })

    expect(screen.getByText('Excellent resource!')).toBeInTheDocument()
    expect(screen.getByText('Average experience.')).toBeInTheDocument()
  })

  it('shows error when API fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load reviews. Please try again.')).toBeInTheDocument()
    })
  })

  it('shows error when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load reviews. Please try again.')).toBeInTheDocument()
    })
  })

  it('fetches user votes when authenticated and reviews exist', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-3' },
      isAuthenticated: true,
    })

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: sampleReviews }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ review_id: 'review-1', is_helpful: true }],
          }),
      })

    global.fetch = mockFetch

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })

    // Should have made 2 fetch calls: reviews + votes
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[1][0]).toContain('/api/reviews/helpfulness')
  })

  it('renders sort and header controls when reviews exist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: sampleReviews }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      // Header shows review count
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })

    // MUI Select renders with combobox role
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows "Write Review" button in header when callback provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: sampleReviews }),
    })

    const onWriteReviewClick = vi.fn()
    render(<ReviewsList resourceId="res-1" onWriteReviewClick={onWriteReviewClick} />)

    await waitFor(() => {
      expect(screen.getByText('Write Review')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Write Review'))
    expect(onWriteReviewClick).toHaveBeenCalled()
  })

  it('sorts reviews by most recent (default)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: sampleReviews }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })

    // Reviews should be in order: review-1 (July 1) before review-2 (June 15)
    const reviews = screen.getAllByText(/resource|experience/i)
    expect(reviews[0]).toHaveTextContent('Excellent resource!')
  })

  it('sorts reviews by most helpful', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: sampleReviews }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })

    // Change sort to "Most Helpful"
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)

    await waitFor(() => {
      expect(screen.getByText('Most Helpful')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Most Helpful'))

    // review-1 has helpful_count=10, review-2 has helpful_count=2
    // So review-1 should be first
    const reviews = screen.getAllByText(/resource|experience/i)
    expect(reviews[0]).toHaveTextContent('Excellent resource!')
  })

  it('sorts reviews by highest rating', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: sampleReviews }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)

    await waitFor(() => {
      expect(screen.getByText('Highest Rating')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Highest Rating'))

    // review-1 has rating=5, review-2 has rating=3
    const reviews = screen.getAllByText(/resource|experience/i)
    expect(reviews[0]).toHaveTextContent('Excellent resource!')
  })

  it('sorts reviews by lowest rating', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: sampleReviews }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)

    await waitFor(() => {
      expect(screen.getByText('Lowest Rating')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Lowest Rating'))

    // review-2 has rating=3, review-1 has rating=5
    const reviews = screen.getAllByText(/resource|experience/i)
    expect(reviews[0]).toHaveTextContent('Average experience.')
  })

  it('does not show "Write a Review" in empty state when no callback provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    })

    // No "Write a Review" button without onWriteReviewClick
    expect(screen.queryByText('Write a Review')).not.toBeInTheDocument()
  })

  it('does not show "Write Review" header button when no callback provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: sampleReviews }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })

    expect(screen.queryByText('Write Review')).not.toBeInTheDocument()
  })

  it('handles reviews with null created_at in sort', async () => {
    const reviewsWithNullDate = [
      { ...sampleReviews[0], created_at: null },
      { ...sampleReviews[1], created_at: null },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: reviewsWithNullDate }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })
  })

  it('handles reviews with null helpful_count in sort', async () => {
    const reviewsWithNullHelpful = [
      { ...sampleReviews[0], helpful_count: null },
      { ...sampleReviews[1], helpful_count: null },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: reviewsWithNullHelpful }),
    })

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)

    await waitFor(() => {
      expect(screen.getByText('Most Helpful')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Most Helpful'))
  })

  it('handles votes response with no data field', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-3' },
      isAuthenticated: true,
    })

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: sampleReviews }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // No data field
      })

    global.fetch = mockFetch

    render(<ReviewsList resourceId="res-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument()
    })
  })
})
