import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ResourceCard from '@/components/resources/ResourceCard'
const recordSearchContact = vi.hoisted(() => vi.fn())
vi.mock('@/lib/context/LocationContext', () => ({ useUserLocation: () => ({ coordinates: null }) }))
vi.mock('@/components/user/FavoriteButton', () => ({ FavoriteButton: () => <button>Save</button> }))
vi.mock('@/lib/analytics/search-journey', () => ({ recordSearchContact }))
vi.mock('@/lib/analytics/queue', () => ({ analytics: { track: vi.fn() } }))
describe('resource card contact hierarchy', () => {
  it('puts contact after the service summary and before address and eligibility details', () => {
    render(
      <ResourceCard
        resource={{
          id: 'physical',
          name: 'Housing support',
          primary_category: 'housing',
          services_offered: ['Emergency shelter', 'Housing applications'],
          phone: '214-555-0100',
          address: '123 Main Street',
          eligibility_requirements: 'Adults returning to Dallas',
          address_type: 'physical',
        }}
      />
    )
    const summary = screen.getByText('Emergency shelter · Housing applications')
    const call = screen.getByRole('link', { name: 'Call Housing support' })
    const address = screen.getByTestId('resource-address')
    const eligibility = screen.getByText(/Adults returning to Dallas/)
    expect(summary.compareDocumentPosition(call) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(call.compareDocumentPosition(address) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(
      call.compareDocumentPosition(eligibility) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    fireEvent.click(call)
    expect(recordSearchContact).toHaveBeenCalledWith('call')
  })
  it('keeps statewide coverage readable without technical map-anchor copy', () => {
    render(
      <ResourceCard
        resource={{
          id: 'area',
          name: '7More',
          address_type: 'regional',
          address: null,
          latitude: 32.77,
          longitude: -96.79,
          state: 'TX',
          service_area: { type: 'statewide', values: ['Texas'] },
        }}
      />
    )
    expect(screen.getByText('Serves all of Texas')).toBeInTheDocument()
    expect(screen.queryByText(/anchor|not a street address/i)).not.toBeInTheDocument()
  })
})
