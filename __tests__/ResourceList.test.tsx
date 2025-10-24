import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ResourceList from '@/components/resources/ResourceList'

describe('ResourceList', () => {
  it('renders empty state', () => {
    render(<ResourceList resources={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('No resources found')
  })

  it('renders list of resources', () => {
    const resources: Array<{ id: string; name: string }> = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ]

    render(<ResourceList resources={resources} />)
    expect(screen.getByTestId('resource-list')).toBeInTheDocument()
  })
})
