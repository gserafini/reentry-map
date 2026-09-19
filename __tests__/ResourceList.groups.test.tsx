import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ResourceList from '@/components/resources/ResourceList'
vi.mock('@/components/resources/ResourceCard', () => ({
  default: ({ resource }: { resource: { name: string } }) => (
    <div data-testid="resource-card">{resource.name}</div>
  ),
}))
describe('resource location sections', () => {
  it('keeps the first match section first and preserves source order and analytics positions', () => {
    render(
      <ResourceList
        groupByLocationType
        resources={[
          {
            id: 'area1',
            name: '7More',
            address_type: 'regional',
            service_area: { type: 'state', values: ['TX'] },
          },
          { id: 'place1', name: 'Miles of Freedom', address_type: 'physical' },
          {
            id: 'area2',
            name: 'Statewide support',
            address_type: 'online',
            service_area: { type: 'state', values: ['TX'] },
          },
          { id: 'place2', name: 'Community center', address_type: 'physical' },
        ]}
      />
    )
    const sections = screen.getAllByRole('region')
    expect(sections.map((section) => section.getAttribute('aria-label'))).toEqual([
      'Services covering this area',
      'Places to visit',
    ])
    expect(
      within(sections[0])
        .getAllByTestId('resource-card')
        .map((card) => card.textContent)
    ).toEqual(['7More', 'Statewide support'])
    expect(
      within(sections[1])
        .getAllByTestId('resource-card')
        .map((card) => card.textContent)
    ).toEqual(['Miles of Freedom', 'Community center'])
    expect(document.getElementById('resource-place1')).toHaveAttribute('data-result-position', '2')
    expect(document.getElementById('resource-area2')).toHaveAttribute('data-result-position', '3')
  })
  it('keeps unconfirmed nonphysical coverage in a clearly qualified section', () => {
    render(
      <ResourceList
        groupByLocationType
        resources={[
          { id: 'u', name: 'Phone support', address_type: 'regional', service_area: null },
        ]}
      />
    )
    expect(screen.getByRole('region', { name: 'Service area to confirm' })).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Services covering this area' })
    ).not.toBeInTheDocument()
  })
  it('shows a places heading even when only physical results are present', () => {
    render(
      <ResourceList
        groupByLocationType
        resources={[{ id: 'a', name: 'A', address_type: 'physical' }]}
      />
    )
    expect(screen.getByRole('region', { name: 'Places to visit' })).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Services covering this area' })
    ).not.toBeInTheDocument()
  })
  it('shows an area-services heading even when only area results are present', () => {
    render(
      <ResourceList
        groupByLocationType
        resources={[
          {
            id: 'a',
            name: '7More',
            address_type: 'regional',
            service_area: { type: 'state', values: ['TX'] },
          },
        ]}
      />
    )
    expect(screen.getByRole('region', { name: 'Services covering this area' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Places to visit' })).not.toBeInTheDocument()
  })
})
