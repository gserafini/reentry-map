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
})
