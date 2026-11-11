import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResourceDetail } from '@/components/resources/ResourceDetail'
import type { Resource } from '@/lib/types/database'

vi.mock('@/components/map', () => ({ SingleResourceMap: () => <div>Map</div> }))
vi.mock('@/components/user/ReviewsList', () => ({ ReviewsList: () => <div>Reviews</div> }))
vi.mock('@/components/user/RatingStars', () => ({ RatingStars: () => <div>Rate</div> }))

// Mock NextAuth session (needed by child components like FavoriteButton)
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}))

// Mock Next.js router (needed by useAuth)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock analytics
vi.mock('@/lib/analytics/queue', () => ({
  identifyUser: vi.fn(),
  clearUser: vi.fn(),
}))

describe('ResourceDetail', () => {
  const mockResource: Resource = {
    id: '123',
    name: 'Test Resource',
    address: '123 Main St, Oakland, CA 94601',
    latitude: 37.8044,
    longitude: -122.2712,
    primary_category: 'employment',
    status: 'active',
    description: 'A test resource for employment services',
    phone: '510-555-1234',
    email: 'test@example.com',
    website: 'https://example.com',
    services_offered: ['Job training', 'Resume help'],
    rating_average: 4.5,
    rating_count: 10,
    verified: true,
    accepts_records: true,
    appointment_required: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    categories: ['employment', 'education'],
    tags: ['job-search', 'training'],
    eligibility_requirements: 'Must be 18 or older',
    hours: null,
    photos: null,
    logo_url: null,
    timezone: 'America/Los_Angeles',
    zip: '94601',
    slug: 'test-resource',
    state: 'ca',
    city: 'oakland',
    county: 'alameda',
    view_count: 100,
    review_count: 5,
    ai_discovered: false,
    ai_enriched: false,
    ai_last_verified: null,
    ai_verification_score: null,
    data_completeness_score: 0.9,
    phone_verified: true,
    phone_last_verified: '2024-01-01T00:00:00Z',
    verified_by: null,
    verified_date: null,
    status_reason: null,
  }

  it('renders resource name', () => {
    render(<ResourceDetail resource={mockResource} />)
    expect(screen.getByText('Test Resource')).toBeInTheDocument()
  })

  it('displays description', () => {
    render(<ResourceDetail resource={mockResource} />)
    expect(screen.getByText('A test resource for employment services')).toBeInTheDocument()
  })

  it('shows contact information', () => {
    render(<ResourceDetail resource={mockResource} />)
    expect(screen.getByText('510-555-1234')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('displays services offered', () => {
    render(<ResourceDetail resource={mockResource} />)
    expect(screen.getByText('Job training')).toBeInTheDocument()
    expect(screen.getByText('Resume help')).toBeInTheDocument()
  })

  it('shows sourced fees and nonempty documents to bring', () => {
    render(
      <ResourceDetail
        resource={{
          ...mockResource,
          fees: 'Free services; some programs use a sliding fee scale.',
          required_documents: ['Photo ID', '', 'Proof of income', '  '],
        }}
      />
    )

    expect(screen.getByText('Cost and fees')).toBeInTheDocument()
    expect(
      screen.getByText('Free services; some programs use a sliding fee scale.')
    ).toBeInTheDocument()
    expect(screen.getByText('Documents to bring')).toBeInTheDocument()
    expect(screen.getByText('Photo ID')).toBeInTheDocument()
    expect(screen.getByText('Proof of income')).toBeInTheDocument()
    expect(screen.getByText('Photo ID').closest('ul')?.querySelectorAll('li')).toHaveLength(2)
  })

  it('gives contact-first guidance when fees or document requirements are missing', () => {
    render(
      <ResourceDetail
        resource={{
          ...mockResource,
          fees: '  ',
          required_documents: [],
        }}
      />
    )

    expect(screen.getByText('Cost and fees')).toBeInTheDocument()
    expect(screen.getByText('Call to ask about costs and fees.')).toBeInTheDocument()
    expect(screen.getByText('Documents to bring')).toBeInTheDocument()
    expect(screen.getByText('Call to ask which documents to bring.')).toBeInTheDocument()
  })

  it('displays hours in weekday order when the stored keys are shuffled', () => {
    render(
      <ResourceDetail
        resource={{
          ...mockResource,
          hours: {
            sunday: 'Closed',
            friday: '9 AM - 5 PM',
            monday: '9 AM - 5 PM',
            wednesday: '9 AM - 5 PM',
            tuesday: '9 AM - 5 PM',
            saturday: 'Closed',
            thursday: '9 AM - 5 PM',
          },
        }}
      />
    )

    const monday = screen.getByText('monday:')
    const hoursList = monday.closest('ul')
    expect(hoursList).not.toBeNull()
    expect(Array.from(hoursList!.children).map((item) => item.textContent)).toEqual([
      'monday: 9 AM - 5 PM',
      'tuesday: 9 AM - 5 PM',
      'wednesday: 9 AM - 5 PM',
      'thursday: 9 AM - 5 PM',
      'friday: 9 AM - 5 PM',
      'saturday: Closed',
      'sunday: Closed',
    ])
  })

  it('does not label an undated verified flag as an automated check', () => {
    render(<ResourceDetail resource={mockResource} />)
    expect(screen.queryByText('AI Verified')).not.toBeInTheDocument()
    expect(screen.getByText(/Check date unavailable/)).toBeInTheDocument()
  })

  it('shows a website review timestamp when the legacy review date is absent', () => {
    render(
      <ResourceDetail
        resource={{
          ...mockResource,
          verified_date: null,
          last_verified_at: '2026-07-08T19:30:00Z',
        }}
      />
    )
    expect(screen.getByText(/Listing reviewed Jul 8, 2026/)).toBeInTheDocument()
  })

  it.each(['America/New_York', 'America/Chicago'])(
    'uses the resource timezone for website review dates (%s)',
    (timezone) => {
      render(
        <ResourceDetail
          resource={{
            ...mockResource,
            timezone,
            last_verified_at: '2026-11-11T02:00:00Z',
          }}
        />
      )

      expect(screen.getByText(/Listing reviewed Nov 10, 2026/)).toBeInTheDocument()
    }
  )

  it('falls back to UTC when the resource timezone is invalid', () => {
    render(
      <ResourceDetail
        resource={{
          ...mockResource,
          timezone: 'Not/A_Real_Zone',
          last_verified_at: '2026-11-11T02:00:00Z',
        }}
      />
    )

    expect(screen.getByText(/Listing reviewed Nov 11, 2026/)).toBeInTheDocument()
  })

  it('keeps a legacy date-only review date on its stated calendar day', () => {
    render(
      <ResourceDetail
        resource={{
          ...mockResource,
          timezone: 'Pacific/Kiritimati',
          verified_date: '2026-11-10',
        }}
      />
    )

    expect(screen.getByText(/Listing reviewed Nov 10, 2026/)).toBeInTheDocument()
  })

  it('prefers the website review date over the legacy date when both are valid', () => {
    render(
      <ResourceDetail
        resource={{
          ...mockResource,
          last_verified_at: '2026-07-08T19:30:00Z',
          verified_date: '2025-02-03T12:00:00Z',
        }}
      />
    )
    expect(screen.getByText(/Listing reviewed Jul 8, 2026/)).toBeInTheDocument()
    expect(screen.queryByText(/Listing reviewed Feb 3, 2025/)).not.toBeInTheDocument()
  })

  it('does not display an invalid website or legacy review date', () => {
    render(
      <ResourceDetail
        resource={{ ...mockResource, last_verified_at: 'invalid', verified_date: 'invalid' }}
      />
    )
    expect(screen.getByText(/Check date unavailable/)).toBeInTheDocument()
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument()
  })

  it('falls back to a valid legacy review date when the website review date is invalid', () => {
    render(
      <ResourceDetail
        resource={{
          ...mockResource,
          last_verified_at: 'not-a-date',
          verified_date: '2025-02-03T12:00:00Z',
        }}
      />
    )
    expect(screen.getByText(/Listing reviewed Feb 3, 2025/)).toBeInTheDocument()
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument()
  })

  it('keeps automated-check wording when both automated and website review dates exist', () => {
    render(
      <ResourceDetail
        resource={{
          ...mockResource,
          ai_last_verified: '2026-09-01T12:00:00Z',
          last_verified_at: '2026-07-08T19:30:00Z',
        }}
      />
    )
    expect(
      screen.getByText(
        /Public-information checks do not confirm current openings or eligibility for you/
      )
    ).toBeInTheDocument()
    expect(screen.queryByText(/Listing reviewed/)).not.toBeInTheDocument()
  })

  it('displays rating information', () => {
    render(<ResourceDetail resource={mockResource} />)
    expect(screen.getByText(/4.5/)).toBeInTheDocument()
    const container = screen
      .getByText(/4.5/)
      .closest('[itemtype="https://schema.org/LocalBusiness"]')
    expect(container).toHaveTextContent('10')
  })

  it('shows statewide coverage clearly and hides directions for statewide resources', () => {
    render(
      <ResourceDetail
        resource={
          {
            ...mockResource,
            address: '',
            city: 'Lubbock',
            state: 'TX',
            address_type: 'regional',
            service_area: { type: 'statewide', values: ['Texas'] },
          } as Resource
        }
      />
    )

    expect(screen.getByText('Statewide resource')).toBeInTheDocument()
    expect(screen.getByText('Serves all of Texas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /get directions/i })).not.toBeInTheDocument()
  })
})
