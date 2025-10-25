import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ResourceList from '@/components/resources/ResourceList'
import { LocationProvider } from '@/lib/context/LocationContext'

describe('ResourceList', () => {
  it('renders empty state', () => {
    render(
      <LocationProvider>
        <ResourceList resources={[]} />
      </LocationProvider>
    )
    expect(screen.getByRole('status')).toHaveTextContent('No resources found')
  })

  it('renders list of resources', () => {
    const resources: Array<{ id: string; name: string }> = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ]

    render(
      <LocationProvider>
        <ResourceList resources={resources} />
      </LocationProvider>
    )
    expect(screen.getByTestId('resource-list')).toBeInTheDocument()
  })
})
