import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ResourceCard from '@/components/resources/ResourceCard'
import { LocationProvider } from '@/lib/context/LocationContext'

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

    // FavoriteButton should be rendered
    const favoriteButtons = screen.getAllByRole('button')
    expect(favoriteButtons.length).toBeGreaterThan(0)
  })
})
