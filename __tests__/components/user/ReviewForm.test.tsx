import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

import { ReviewForm } from '@/components/user/ReviewForm'

// Helper to find the review text textarea
function getReviewTextarea() {
  // MUI TextField with multiline renders a textarea
  const textareas = screen.getAllByRole('textbox')
  // The review text textarea is the first one with maxLength 500
  return (
    textareas.find((el) => el.tagName === 'TEXTAREA' && el.getAttribute('maxlength') === '500') ||
    textareas[0]
  )
}

describe('ReviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
    })
    // Default: no existing review
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ review: null }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows sign-in message when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('shows loading spinner while checking for existing review', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)
    expect(screen.queryByText('Write a Review')).not.toBeInTheDocument()
  })

  it('renders form for new review after loading', async () => {
    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Write a Review')).toBeInTheDocument()
    })

    expect(screen.getByText(/share your experience/i)).toBeInTheDocument()
    expect(screen.getByText('Your Rating *')).toBeInTheDocument()
    expect(screen.getByText('Submit Review')).toBeInTheDocument()
  })

  it('renders "Edit Your Review" when existing review found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          review: {
            id: 'review-1',
            rating: 4,
            text: 'Great place',
            pros: ['Friendly staff'],
            cons: ['Limited hours'],
            tips: 'Arrive early',
            was_helpful: true,
            would_recommend: true,
          },
        }),
    })

    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Edit Your Review')).toBeInTheDocument()
    })

    expect(screen.getByText('Update Review')).toBeInTheDocument()
  })

  it('populates form with existing review data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          review: {
            id: 'review-1',
            rating: 3,
            text: 'Decent resource',
            pros: 'Good staff',
            cons: 'Small space',
            tips: 'Call ahead',
          },
        }),
    })

    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Decent resource')).toBeInTheDocument()
    })
  })

  it('shows validation error when submitting without rating', async () => {
    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Submit Review')).toBeInTheDocument()
    })

    // Fill in text but not rating
    const textarea = getReviewTextarea()
    fireEvent.change(textarea, { target: { value: 'A good resource' } })

    fireEvent.click(screen.getByText('Submit Review'))

    await waitFor(() => {
      expect(screen.getByText('Please provide a rating')).toBeInTheDocument()
    })
  })

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn()
    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" onCancel={onCancel} />)

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not show cancel button when onCancel not provided', async () => {
    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Submit Review')).toBeInTheDocument()
    })

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('shows character count helper text', async () => {
    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('0/500 characters')).toBeInTheDocument()
    })
  })

  it('updates character count when typing', async () => {
    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('0/500 characters')).toBeInTheDocument()
    })

    const textarea = getReviewTextarea()
    fireEvent.change(textarea, { target: { value: 'Hello' } })

    expect(screen.getByText('5/500 characters')).toBeInTheDocument()
  })

  it('submits new review via POST', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ review: null }),
      })
      .mockResolvedValueOnce({ ok: true })

    global.fetch = mockFetch

    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Submit Review')).toBeInTheDocument()
    })

    // Set rating via radio buttons
    const stars = screen.getAllByRole('radio')
    if (stars.length > 0) {
      fireEvent.click(stars[3]) // 4 stars
    }

    // Set review text
    const textarea = getReviewTextarea()
    fireEvent.change(textarea, { target: { value: 'Very helpful resource with great staff' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Review'))
    })

    const postCall = mockFetch.mock.calls.find(
      (call) => typeof call[1] === 'object' && call[1].method === 'POST'
    )
    expect(postCall).toBeTruthy()
    expect(postCall![0]).toBe('/api/reviews')
  })

  it('handles API error on submit', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ review: null }),
      })
      .mockResolvedValueOnce({ ok: false })

    global.fetch = mockFetch

    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Submit Review')).toBeInTheDocument()
    })

    const stars = screen.getAllByRole('radio')
    if (stars.length > 0) fireEvent.click(stars[3])
    const textarea = getReviewTextarea()
    fireEvent.change(textarea, { target: { value: 'Great resource' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Review'))
    })

    await waitFor(() => {
      expect(screen.getByText('Failed to submit review. Please try again.')).toBeInTheDocument()
    })
  })

  it('handles network error on submit', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ review: null }),
      })
      .mockRejectedValueOnce(new Error('Network error'))

    global.fetch = mockFetch

    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Submit Review')).toBeInTheDocument()
    })

    const stars = screen.getAllByRole('radio')
    if (stars.length > 0) fireEvent.click(stars[3])
    const textarea = getReviewTextarea()
    fireEvent.change(textarea, { target: { value: 'Great resource' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Review'))
    })

    await waitFor(() => {
      expect(
        screen.getByText('An unexpected error occurred. Please try again.')
      ).toBeInTheDocument()
    })
  })

  it('redirects to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })

    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('handles checking existing review error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('Write a Review')).toBeInTheDocument()
    })
  })

  it('renders checkboxes for helpfulness and recommendation', async () => {
    render(<ReviewForm resourceId="res-1" resourceName="Test Resource" />)

    await waitFor(() => {
      expect(screen.getByText('This resource was helpful to me')).toBeInTheDocument()
    })

    expect(screen.getByText('I would recommend this resource')).toBeInTheDocument()
  })
})
