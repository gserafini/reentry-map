import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from '@/app/page'

const { getResources, getResourceCount } = vi.hoisted(() => ({
  getResources: vi.fn(),
  getResourceCount: vi.fn(),
}))
vi.mock('@/lib/api/resources', () => ({ getResources, getResourceCount }))
vi.mock('@/components/analytics/PageViewTracker', () => ({ PageViewTracker: () => null }))
vi.mock('@/components/search/HeroSearch', () => ({ HeroSearch: () => <div>Search form</div> }))
vi.mock('@/components/search/LocationUrlSync', () => ({ LocationUrlSync: () => null }))
vi.mock('@/components/resources/ResourceList', () => ({
  ResourceList: () => <div>Local results</div>,
}))
vi.mock('@/components/resources/FeaturedResourcesList', () => ({
  FeaturedResourcesList: () => <div>Local results</div>,
}))

describe('Homepage discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getResources.mockResolvedValue({ data: [{ id: 'r1', name: 'Help Center' }], error: null })
    getResourceCount.mockResolvedValue({ data: 5781, error: null })
  })

  it('offers a nationwide state directory without unsupported top-rated claims', async () => {
    render(await HomePage({ searchParams: Promise.resolve({}) }))
    expect(screen.queryByText('Top-Rated Resources')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Texas' })).toHaveAttribute('href', '/tx')
    expect(screen.getByRole('link', { name: 'Hawaii' })).toHaveAttribute('href', '/hi')
    expect(screen.getByRole('link', { name: 'Alaska' })).toHaveAttribute('href', '/ak')
    expect(getResources).not.toHaveBeenCalled()
  })

  it('uses the selected city for discovery and preserves it in category links', async () => {
    render(
      await HomePage({
        searchParams: Promise.resolve({
          locationName: 'Dallas, TX, USA',
          lat: '32.7767',
          lng: '-96.797',
          distance: '25',
        }),
      })
    )
    expect(getResources).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 32.7767,
        longitude: -96.797,
        radius_miles: 25,
        limit: 6,
      })
    )
    expect(screen.getByText(/Help near Dallas/)).toBeInTheDocument()
    const housing = new URL(
      screen.getByRole('link', { name: /^Housing/ }).getAttribute('href')!,
      'https://reentrymap.org'
    )
    expect(housing.searchParams.get('lat')).toBe('32.7767')
    expect(housing.searchParams.get('lng')).toBe('-96.797')
    expect(housing.searchParams.get('categories')).toBe('housing')
  })
})
