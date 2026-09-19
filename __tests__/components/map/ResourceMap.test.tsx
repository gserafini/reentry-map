import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ResourceMap } from '@/components/map/ResourceMap'
import type { Resource } from '@/lib/types/database'

// Mock Google Maps initialization
vi.mock('@/lib/google-maps', () => ({
  initializeGoogleMaps: vi.fn().mockResolvedValue({
    places: {},
    geocoding: {},
    maps: {},
    marker: {},
  }),
}))

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_DEFAULT_LATITUDE: 37.8044,
    NEXT_PUBLIC_DEFAULT_LONGITUDE: -122.2712,
  },
}))

// Mock Google Maps global objects
global.google = {
  maps: {
    Map: vi.fn(function MapMock() {
      return {
        addListener: vi.fn(),
        setCenter: vi.fn(),
        setZoom: vi.fn(),
        fitBounds: vi.fn(),
        panTo: vi.fn(),
        getZoom: vi.fn().mockReturnValue(12),
      }
    }),
    InfoWindow: vi.fn(function InfoWindowMock() {
      return {
        setContent: vi.fn(),
        open: vi.fn(),
        close: vi.fn(),
        setPosition: vi.fn(),
      }
    }),
    LatLngBounds: vi.fn(function LatLngBoundsMock() {
      return {
        extend: vi.fn(),
      }
    }),
    Circle: vi.fn(function CircleMock() {
      return {
        setMap: vi.fn(),
        addListener: vi.fn(),
      }
    }),
    Polygon: vi.fn(function PolygonMock() {
      return {
        setMap: vi.fn(),
        addListener: vi.fn(),
      }
    }),
    marker: {
      AdvancedMarkerElement: vi.fn(function AdvancedMarkerElementMock() {
        return {
          map: null,
          position: null,
          addListener: vi.fn(),
        }
      }),
      PinElement: vi.fn(function PinElementMock() {
        return {
          element: document.createElement('div'),
        }
      }),
    },
    event: {
      trigger: vi.fn(),
      addListenerOnce: vi.fn(),
      removeListener: vi.fn(),
    },
  },
} as unknown as typeof google

vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            state_code: 'WA',
            county_name: 'Mason County',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-123.3, 47.2],
                [-123.0, 47.2],
                [-123.0, 47.4],
                [-123.3, 47.4],
                [-123.3, 47.2],
              ],
            ],
          },
        },
      ],
    }),
  })
)

// Mock MarkerClusterer
vi.mock('@googlemaps/markerclusterer', () => ({
  MarkerClusterer: vi.fn().mockImplementation(() => ({
    clearMarkers: vi.fn(),
  })),
}))

describe('ResourceMap', () => {
  const mockResources: Resource[] = [
    {
      id: '1',
      name: 'Test Resource 1',
      address: '123 Main St',
      latitude: 37.8044,
      longitude: -122.2712,
      primary_category: 'employment',
      categories: ['employment'],
      description: 'Test description',
      phone: null,
      email: null,
      website: null,
      hours: null,
      services_offered: null,
      tags: null,
      status: 'active',
      verified: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      city: 'Oakland',
      state: 'CA',
      zip: '94612',
      county: null,
      timezone: null,
      slug: null,
      logo_url: null,
      photos: null,
      rating_average: null,
      rating_count: null,
      review_count: null,
      view_count: null,
      ai_discovered: null,
      ai_enriched: null,
      ai_last_verified: null,
      ai_verification_score: null,
      data_completeness_score: null,
      eligibility_requirements: null,
      appointment_required: null,
      accepts_records: null,
      phone_verified: null,
      phone_last_verified: null,
      verified_by: null,
      verified_date: null,
      status_reason: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<ResourceMap resources={[]} />)
    // Component should render - actual behavior tested in integration tests
    expect(container).toBeTruthy()
  })

  it('shows loading state initially', () => {
    render(<ResourceMap resources={mockResources} />)

    // Should show loading message initially
    expect(screen.getByText(/Loading map/i)).toBeInTheDocument()
  })

  it('accepts custom height prop', () => {
    const { container } = render(<ResourceMap resources={mockResources} height="700px" />)

    // Map container should exist
    expect(container.firstChild).toBeTruthy()
  })

  it('accepts resources prop', () => {
    const { container } = render(<ResourceMap resources={mockResources} />)

    // Component should render with resources
    expect(container).toBeTruthy()
  })

  it('accepts userLocation prop', () => {
    const { container } = render(
      <ResourceMap
        resources={mockResources}
        userLocation={{ latitude: 37.8044, longitude: -122.2712 }}
      />
    )

    // Component should render with user location
    expect(container).toBeTruthy()
  })

  it('falls back to the default center when userLocation is invalid', async () => {
    render(
      <ResourceMap
        resources={mockResources}
        userLocation={{ latitude: Number.NaN, longitude: Number.NaN }}
      />
    )

    // Wait for async map init to run
    await screen.findByText(/Loading map/i)

    expect(global.google.maps.Map).toHaveBeenCalled()
    const [, options] = vi.mocked(global.google.maps.Map).mock.calls.at(-1) as [
      HTMLElement,
      { center: { lat: number; lng: number } },
    ]

    expect(options.center).toEqual({
      lat: 37.8044,
      lng: -122.2712,
    })
  })

  it('accepts onResourceClick callback', () => {
    const mockOnClick = vi.fn()
    const { container } = render(
      <ResourceMap resources={mockResources} onResourceClick={mockOnClick} />
    )

    // Component should render with callback
    expect(container).toBeTruthy()
  })

  it('accepts selectedResourceId prop', () => {
    const { container } = render(<ResourceMap resources={mockResources} selectedResourceId="1" />)

    // Component should render with selected resource
    expect(container).toBeTruthy()
  })

  it('renders county-scoped non-physical resources as coverage geometry instead of exact pins', async () => {
    render(
      <ResourceMap
        resources={[
          {
            ...mockResources[0],
            latitude: 47.2133919,
            longitude: -123.1014187,
            city: 'Shelton',
            state: 'WA',
            address: '',
            address_type: 'regional',
            service_area: { type: 'county', values: ['Mason County'] },
          } as Resource,
        ]}
      />
    )

    await waitFor(() => expect(global.google.maps.Map).toHaveBeenCalled())

    expect(global.google.maps.Polygon).toHaveBeenCalled()
    expect(global.google.maps.marker.AdvancedMarkerElement).not.toHaveBeenCalled()
  })
})
