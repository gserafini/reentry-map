import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NearMeButton } from '@/components/search/NearMeButton'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserLocation } from '@/lib/context/LocationContext'

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock LocationContext
vi.mock('@/lib/context/LocationContext', () => ({
  useUserLocation: vi.fn(),
}))

describe('NearMeButton', () => {
  const mockPush = vi.fn()
  const mockSearchParams = new URLSearchParams()
  const mockRequestLocation = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    })
    ;(useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams)
    ;(useUserLocation as ReturnType<typeof vi.fn>).mockReturnValue({
      requestLocation: mockRequestLocation,
      loading: false,
      error: null,
      coordinates: null,
    })
  })

  it('renders Near Me button', () => {
    render(<NearMeButton />)

    expect(screen.getByRole('button', { name: /near me/i })).toBeInTheDocument()
  })

  it('displays location icon when not loading', () => {
    render(<NearMeButton />)

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Near Me')
  })

  it('displays loading state when requesting location', () => {
    ;(useUserLocation as ReturnType<typeof vi.fn>).mockReturnValue({
      requestLocation: mockRequestLocation,
      loading: true,
      error: null,
      coordinates: null,
    })

    render(<NearMeButton />)

    expect(screen.getByText('Getting location...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('requests location when clicked and no coordinates exist', async () => {
    const user = userEvent.setup()
    render(<NearMeButton />)

    const button = screen.getByRole('button', { name: /near me/i })
    await user.click(button)

    expect(mockRequestLocation).toHaveBeenCalled()
  })

  it('updates URL immediately when coordinates already exist', async () => {
    const user = userEvent.setup()
    ;(useUserLocation as ReturnType<typeof vi.fn>).mockReturnValue({
      requestLocation: mockRequestLocation,
      loading: false,
      error: null,
      coordinates: { latitude: 37.8044, longitude: -122.2712 },
    })

    render(<NearMeButton />)

    const button = screen.getByRole('button', { name: /near me/i })
    await user.click(button)

    expect(mockRequestLocation).not.toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/search?sort=distance-asc')
  })

  it('preserves existing search params when sorting by distance', async () => {
    const user = userEvent.setup()
    const searchParamsWithCategory = new URLSearchParams('category=housing&search=help')
    ;(useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(searchParamsWithCategory)
    ;(useUserLocation as ReturnType<typeof vi.fn>).mockReturnValue({
      requestLocation: mockRequestLocation,
      loading: false,
      error: null,
      coordinates: { latitude: 37.8044, longitude: -122.2712 },
    })

    render(<NearMeButton />)

    const button = screen.getByRole('button', { name: /near me/i })
    await user.click(button)

    expect(mockPush).toHaveBeenCalledWith('/search?category=housing&search=help&sort=distance-asc')
  })

  it('shows error snackbar when location request fails', async () => {
    const user = userEvent.setup()

    // Start with no error
    const { rerender } = render(<NearMeButton />)

    const button = screen.getByRole('button', { name: /near me/i })
    await user.click(button)

    // Simulate location error after click
    ;(useUserLocation as ReturnType<typeof vi.fn>).mockReturnValue({
      requestLocation: mockRequestLocation,
      loading: false,
      error: {
        code: 1,
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError,
      coordinates: null,
    })

    rerender(<NearMeButton />)

    await waitFor(() => {
      expect(screen.getByText(/denied/i)).toBeInTheDocument()
    })
  })

  it('disables button while loading', () => {
    ;(useUserLocation as ReturnType<typeof vi.fn>).mockReturnValue({
      requestLocation: mockRequestLocation,
      loading: true,
      error: null,
      coordinates: null,
    })

    render(<NearMeButton />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows CircularProgress when loading', () => {
    ;(useUserLocation as ReturnType<typeof vi.fn>).mockReturnValue({
      requestLocation: mockRequestLocation,
      loading: true,
      error: null,
      coordinates: null,
    })

    render(<NearMeButton />)

    // CircularProgress should be rendered
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('closes error snackbar when user dismisses it', async () => {
    const user = userEvent.setup()
    ;(useUserLocation as ReturnType<typeof vi.fn>).mockReturnValue({
      requestLocation: mockRequestLocation,
      loading: false,
      error: {
        code: 1,
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError,
      coordinates: null,
    })

    render(<NearMeButton />)

    // Click to trigger error display
    const button = screen.getByRole('button')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText(/denied/i)).toBeInTheDocument()
    })

    // Find and click close button on snackbar
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText(/denied/i)).not.toBeInTheDocument()
    })
  })
})
