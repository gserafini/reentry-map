import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResourceDetail } from '@/components/resources/ResourceDetail'
import ResourceCard from '@/components/resources/ResourceCard'
import type { Resource } from '@/lib/types/database'

vi.mock('@/components/map', () => ({ SingleResourceMap: () => <div>Map</div> }))
vi.mock('@/components/user/ReviewsList', () => ({ ReviewsList: () => <div>Reviews</div> }))
vi.mock('@/components/user/RatingStars', () => ({ RatingStars: () => <div>Rate</div> }))
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/analytics/queue', () => ({ identifyUser: vi.fn(), clearUser: vi.fn() }))
vi.mock('@/lib/context/LocationContext', () => ({
  LocationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUserLocation: () => ({ coordinates: null }),
}))

// Every listing exists to serve people coming home, so a yes/no "accepts records"
// flag carries no information. Only source-backed restrictions and an explicit
// reentry focus are shown.
const baseResource = {
  id: 'r-restrictions',
  name: 'Example Shelter',
  address: '728 W 4th St',
  city: 'Pueblo',
  state: 'CO',
  zip: '81003',
  latitude: 38.270682,
  longitude: -104.6168209,
  primary_category: 'housing',
  categories: ['housing'],
  status: 'active',
  description: 'Overnight shelter.',
  phone: '(719) 555-0100',
  email: null,
  website: 'https://example.org',
  services_offered: ['Overnight shelter'],
  eligibility_requirements: 'Adults who are unhoused.',
  appointment_required: false,
  hours: null,
  tags: null,
  timezone: 'America/Denver',
  verified: true,
  created_at: '2026-11-12T00:00:00Z',
  updated_at: '2026-11-12T00:00:00Z',
} as unknown as Resource

describe('record-related information on listings', () => {
  it('never shows the legacy records-acceptance badge, whatever the old flag says', () => {
    const { unmount } = render(
      <ResourceDetail resource={{ ...baseResource, accepts_records: true } as Resource} />
    )
    expect(screen.queryByText(/Accepts individuals with criminal records/i)).toBeNull()
    unmount()
    render(<ResourceDetail resource={{ ...baseResource, accepts_records: false } as Resource} />)
    expect(screen.queryByText(/May have restrictions for individuals/i)).toBeNull()
  })

  it('shows source-backed record restrictions when a source states them', () => {
    render(
      <ResourceDetail
        resource={
          {
            ...baseResource,
            record_restrictions: 'People on a sex-offender registry cannot stay overnight.',
          } as Resource
        }
      />
    )
    expect(screen.getByText('Record-related restrictions')).toBeInTheDocument()
    expect(
      screen.getByText('People on a sex-offender registry cannot stay overnight.')
    ).toBeInTheDocument()
  })

  it('omits the restrictions section when no restriction is recorded', () => {
    render(<ResourceDetail resource={{ ...baseResource, record_restrictions: '  ' } as Resource} />)
    expect(screen.queryByText('Record-related restrictions')).toBeNull()
  })

  it('labels a program built for people with records on the detail page', () => {
    const { unmount } = render(
      <ResourceDetail resource={{ ...baseResource, reentry_focused: true } as Resource} />
    )
    expect(screen.getByText('Built for people with records')).toBeInTheDocument()
    unmount()
    render(<ResourceDetail resource={{ ...baseResource, reentry_focused: false } as Resource} />)
    expect(screen.queryByText('Built for people with records')).toBeNull()
  })

  it('labels a program built for people with records on search result cards', () => {
    const card = {
      id: 'r-card',
      name: 'Re-Entry Specialists',
      primary_category: 'general-support',
      address: '4109 N Elizabeth St',
      latitude: 38.31,
      longitude: -104.61,
      website: 'https://example.org',
    }
    const { unmount } = render(<ResourceCard resource={{ ...card, reentry_focused: true }} />)
    expect(screen.getByText('Built for people with records')).toBeInTheDocument()
    unmount()
    render(<ResourceCard resource={{ ...card, reentry_focused: false }} />)
    expect(screen.queryByText('Built for people with records')).toBeNull()
  })
})
