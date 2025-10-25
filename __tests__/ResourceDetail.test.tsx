import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResourceDetail } from '@/components/resources/ResourceDetail'
import type { Resource } from '@/lib/types/database'

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

  it('shows verified badge when verified', () => {
    render(<ResourceDetail resource={mockResource} />)
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('displays rating information', () => {
    render(<ResourceDetail resource={mockResource} />)
    expect(screen.getByText(/4.5.*10 reviews/)).toBeInTheDocument()
  })
})
