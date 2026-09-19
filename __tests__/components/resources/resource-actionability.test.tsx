import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResourceCard } from '@/components/resources/ResourceCard'
import { ResourceDetail } from '@/components/resources/ResourceDetail'
import { recordSearchContact } from '@/lib/analytics/search-journey'
import ResourceList from '@/components/resources/ResourceList'
import type { Resource } from '@/lib/types/database'

vi.mock('@/lib/context/LocationContext', () => ({
  useUserLocation: () => ({ coordinates: { latitude: 33.5845, longitude: -101.8552 } }),
}))
vi.mock('@/components/user/FavoriteButton', () => ({
  FavoriteButton: ({ resource }: { resource?: { phone?: string } }) => (
    <button data-phone={resource?.phone}>Save</button>
  ),
}))
vi.mock('@/components/map', () => ({
  SingleResourceMap: () => <div data-testid="detail-map">Map</div>,
}))
vi.mock('@/components/user/RatingStars', () => ({ RatingStars: () => <div>Rate</div> }))
vi.mock('@/components/user/ReviewsList', () => ({ ReviewsList: () => <div>Reviews</div> }))
vi.mock('@/components/user/ReviewForm', () => ({ ReviewForm: () => null }))
vi.mock('@/components/user/ReportProblemModal', () => ({ ReportProblemModal: () => null }))
vi.mock('@/lib/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('@/lib/analytics/search-journey', () => ({ recordSearchContact: vi.fn() }))
vi.mock('@/lib/analytics/queue', () => ({ analytics: { track: vi.fn() } }))

const resource = {
  id: 'r1',
  name: 'Help Center',
  primary_category: 'general-support',
  description: 'Case management and job training.',
  services_offered: ['Job training', 'Food pantry'],
  eligibility_requirements: 'Adults returning to Dallas',
  phone: '214-555-0100',
  website: 'https://example.org',
  address: '123 Main St',
  city: 'Dallas',
  state: 'TX',
  latitude: 32.7767,
  longitude: -96.797,
  rating_average: 0,
  rating_count: 0,
  appointment_required: false,
  verified: true,
  verified_date: null,
  verified_by: null,
  ai_last_verified: null,
} as Resource

describe('Resource actionability and honest evidence', () => {
  it('records search contact attempts from the actual result card action', () => {
    vi.mocked(recordSearchContact).mockClear()
    render(<ResourceCard resource={resource} />)
    fireEvent.click(screen.getByRole('link', { name: 'Call Help Center' }))
    expect(recordSearchContact).toHaveBeenCalledWith('call')
  })
  it('records search contact attempts from the actual detail action', () => {
    vi.mocked(recordSearchContact).mockClear()
    render(<ResourceDetail resource={resource} />)
    fireEvent.click(screen.getByRole('link', { name: /^Call/ }))
    expect(recordSearchContact).toHaveBeenCalledWith('call')
  })
  it('shows dated check evidence in a result before opening details', () => {
    render(
      <ResourceCard
        resource={{ ...resource, ai_last_verified: '2026-09-01T12:00:00Z' }}
        userLocation={null}
      />
    )
    expect(
      screen.getByRole('button', { name: 'About the automated check on Sep 1, 2026' })
    ).toBeInTheDocument()
  })

  it('keeps resource text inside JSON-LD when it contains script markup', () => {
    const { container } = render(
      <ResourceDetail
        resource={{ ...resource, description: '</script><script>alert(1)</script>' }}
      />
    )
    const json = container.querySelector('script[type="application/ld+json"]')!.textContent!
    expect(json).not.toContain('</script>')
    expect(JSON.parse(json).description).toBe('</script><script>alert(1)</script>')
  })

  it('identifies unconfirmed coverage for a nonphysical local service', () => {
    render(
      <ResourceCard
        resource={{ ...resource, address_type: 'hotline', service_area: null }}
        userLocation={null}
      />
    )
    expect(screen.getByText(/Service area not confirmed/)).toBeInTheDocument()
    expect(screen.queryByTestId('resource-distance')).not.toBeInTheDocument()
  })

  it('shows useful services, eligibility and a call action on result cards', () => {
    render(<ResourceCard resource={resource} />)
    expect(screen.getByText('General Support')).toBeInTheDocument()
    expect(screen.getByText(/Job training.*Food pantry/)).toBeInTheDocument()
    expect(screen.getByText(/Adults returning to Dallas/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Call Help Center/ })).toHaveAttribute(
      'href',
      'tel:214-555-0100'
    )
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
      'data-phone',
      '214-555-0100'
    )
    expect(screen.queryByRole('img', { name: /stars/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/No ratings|\(0\)/)).not.toBeInTheDocument()
  })

  it('allows explicitly disabling cached distances on cards', () => {
    render(<ResourceCard resource={resource} userLocation={null} />)
    expect(screen.queryByTestId('resource-distance')).not.toBeInTheDocument()
  })

  it('passes contact fields through result lists', () => {
    render(<ResourceList resources={[resource]} userLocation={null} singleColumn />)
    expect(screen.getByRole('link', { name: /Call Help Center/ })).toBeInTheDocument()
    expect(document.getElementById('resource-r1')).toBeInTheDocument()
  })

  it('puts contact and intake before the map without inventing walk-ins', () => {
    render(<ResourceDetail resource={resource} />)
    const call = screen.getByRole('link', { name: /^Call/ })
    expect(screen.queryByTestId('detail-map')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Show location map/ }))
    const map = screen.getByTestId('detail-map')
    expect(call.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText(/Walk-ins welcome/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Ask about appointments, eligibility, and availability/)
    ).toBeInTheDocument()
    expect(screen.getByText(/Adults returning to Dallas/)).toBeInTheDocument()
    expect(screen.queryByText('AI Verified')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Average rating/)).not.toBeInTheDocument()
  })

  it('identifies dated automated checks without calling them provider confirmation', () => {
    render(<ResourceDetail resource={{ ...resource, ai_last_verified: '2026-09-01T12:00:00Z' }} />)
    expect(screen.getByText(/Automated check/)).toBeInTheDocument()
    expect(screen.getByText(/Sep 1, 2026/)).toBeInTheDocument()
    expect(screen.queryByText(/Provider confirmed/)).not.toBeInTheDocument()
  })
})
