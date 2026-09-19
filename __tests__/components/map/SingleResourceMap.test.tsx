import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { SingleResourceMap } from '@/components/map/SingleResourceMap'
import type { Resource } from '@/lib/types/database'
import { initializeGoogleMaps } from '@/lib/google-maps'

vi.mock('@/lib/google-maps', () => ({
  initializeGoogleMaps: vi.fn().mockResolvedValue({
    places: {},
    geocoding: {},
    maps: {},
    marker: {},
  }),
}))

vi.mock('@/lib/utils/map-marker-icon', () => ({
  createCategoryMarkerElement: vi.fn(() => document.createElement('div')),
}))

describe('SingleResourceMap', () => {
  const baseResource = {
    id: 'resource-1',
    name: 'Blessed Abode Homes',
    address: '',
    latitude: null,
    longitude: null,
    primary_category: 'housing',
    status: 'active',
    description: 'Regional housing resource',
    phone: null,
    email: null,
    website: null,
    services_offered: null,
    rating_average: null,
    rating_count: null,
    verified: false,
    accepts_records: true,
    appointment_required: false,
    created_at: '2026-06-11T00:00:00Z',
    updated_at: '2026-06-11T00:00:00Z',
    categories: ['housing'],
    tags: null,
    eligibility_requirements: null,
    hours: null,
    photos: null,
    logo_url: null,
    timezone: 'America/Los_Angeles',
    zip: null,
    slug: 'blessed-abode-homes',
    state: 'TX',
    city: 'Lubbock',
    county: null,
    view_count: 0,
    review_count: 0,
    ai_discovered: false,
    ai_enriched: false,
    ai_last_verified: null,
    ai_verification_score: null,
    data_completeness_score: null,
    phone_verified: false,
    phone_last_verified: null,
    verified_by: null,
    verified_date: null,
    status_reason: null,
  } as unknown as Resource

  beforeEach(() => {
    vi.clearAllMocks()

    global.google = {
      maps: {
        Map: vi.fn(function MapMock(_el, options) {
          return { options }
        }),
        InfoWindow: vi.fn(function InfoWindowMock() {
          return {
            setContent: vi.fn(),
            open: vi.fn(),
            setPosition: vi.fn(),
          }
        }),
        Circle: vi.fn(function CircleMock() {
          return {
            setMap: vi.fn(),
            addListener: vi.fn(),
          }
        }),
        marker: {
          AdvancedMarkerElement: vi.fn(function AdvancedMarkerElementMock() {
            return {
              map: null,
              addListener: vi.fn(),
            }
          }),
        },
      },
    } as unknown as typeof google
  })

  it('shows an informational fallback instead of loading Google Maps when coordinates are missing', async () => {
    render(<SingleResourceMap resource={baseResource} />)

    expect(
      await screen.findByText(/precise map pin isn't available for this resource/i)
    ).toBeInTheDocument()
    expect(vi.mocked(initializeGoogleMaps)).not.toHaveBeenCalled()
  })

  it('uses an approximate city-level map treatment for non-physical resources with approximate coordinates', async () => {
    render(
      <SingleResourceMap
        resource={
          {
            ...baseResource,
            latitude: 33.5855677,
            longitude: -101.8470215,
            address_type: 'regional',
            service_area: { type: 'city', values: ['Lubbock'] },
          } as unknown as Resource
        }
      />
    )

    await waitFor(() => expect(global.google.maps.Map).toHaveBeenCalled())

    const [, options] = vi.mocked(global.google.maps.Map).mock.calls.at(-1) as [
      HTMLElement,
      { center: { lat: number; lng: number }; zoom: number },
    ]

    expect(options.center).toEqual({
      lat: 33.5855677,
      lng: -101.8470215,
    })
    expect(options.zoom).toBe(10)
    expect(global.google.maps.marker.AdvancedMarkerElement).not.toHaveBeenCalled()
    expect(global.google.maps.Circle).toHaveBeenCalled()
    expect(screen.getByText(/approximate city-level location/i)).toBeInTheDocument()
  })
})
