import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

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
  })

  it('shows an informational fallback instead of loading Google Maps when coordinates are missing', async () => {
    render(<SingleResourceMap resource={baseResource} />)

    expect(
      await screen.findByText(/precise map pin isn't available for this resource/i)
    ).toBeInTheDocument()
    expect(vi.mocked(initializeGoogleMaps)).not.toHaveBeenCalled()
  })
})
