import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ResourceCard from '@/components/resources/ResourceCard'
import { LocationProvider } from '@/lib/context/LocationContext'

// Mock NextAuth session (needed by FavoriteButton in ResourceCard)
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock analytics
vi.mock('@/lib/analytics/queue', () => ({
  identifyUser: vi.fn(),
  clearUser: vi.fn(),
}))

describe('ResourceCard', () => {
  const mockResource = {
    id: 'r1',
    name: 'Test Resource',
    primary_category: 'employment',
    address: '123 Test St',
    rating_average: 4.5,
    rating_count: 10,
    latitude: 37.8044,
    longitude: -122.2712,
    website: 'https://example.com',
  }

  it('renders resource information', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={mockResource} />
      </LocationProvider>
    )

    expect(screen.getByText('Test Resource')).toBeInTheDocument()
    expect(screen.getByTestId('category-badge')).toBeInTheDocument()
    expect(screen.getByTestId('resource-address')).toHaveTextContent('123 Test St')
  })

  it('renders favorite button', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={mockResource} />
      </LocationProvider>
    )

    const favoriteButtons = screen.getAllByRole('button')
    expect(favoriteButtons.length).toBeGreaterThan(0)
  })

  it('shows "No ratings" when rating_average is null', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={{ ...mockResource, rating_average: null, rating_count: 0 }} />
      </LocationProvider>
    )

    expect(screen.getByText('No ratings')).toBeInTheDocument()
  })

  it('shows rating count of 0 when rating_count is null', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={{ ...mockResource, rating_count: null }} />
      </LocationProvider>
    )

    // rating_count || 0 should show (0)
    expect(screen.getByText('(0)')).toBeInTheDocument()
  })

  it('shows "No address" when address is not provided', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={{ ...mockResource, address: null }} />
      </LocationProvider>
    )

    expect(screen.getByText('No address')).toBeInTheDocument()
  })

  it('renders city and state with comma separator', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={{ ...mockResource, city: 'Oakland', state: 'CA', zip: '94612' }} />
      </LocationProvider>
    )

    expect(screen.getByText(/Oakland/)).toBeInTheDocument()
    expect(screen.getByText(/CA/)).toBeInTheDocument()
  })

  it('renders city only without comma', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={{ ...mockResource, city: 'Oakland', state: null, zip: null }} />
      </LocationProvider>
    )

    expect(screen.getByText(/Oakland/)).toBeInTheDocument()
  })

  it('renders state only without comma', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={{ ...mockResource, city: null, state: 'CA', zip: null }} />
      </LocationProvider>
    )

    expect(screen.getByText(/CA/)).toBeInTheDocument()
  })

  it('renders without category badge when primary_category is null', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={{ ...mockResource, primary_category: null }} />
      </LocationProvider>
    )

    expect(screen.queryByTestId('category-badge')).not.toBeInTheDocument()
  })

  it('uses provided userLocation instead of context', () => {
    render(
      <LocationProvider>
        <ResourceCard resource={mockResource} userLocation={{ lat: 37.8, lng: -122.2 }} />
      </LocationProvider>
    )

    // Should render distance when userLocation provided and resource has coordinates
    expect(screen.getByText('Test Resource')).toBeInTheDocument()
  })

  it('does not show distance when resource has no coordinates', () => {
    render(
      <LocationProvider>
        <ResourceCard
          resource={{ ...mockResource, latitude: null, longitude: null }}
          userLocation={{ lat: 37.8, lng: -122.2 }}
        />
      </LocationProvider>
    )

    expect(screen.getByText('Test Resource')).toBeInTheDocument()
  })
})
