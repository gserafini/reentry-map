import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ResourceList from '@/components/resources/ResourceList'
import { LocationProvider } from '@/lib/context/LocationContext'

// Mock NextAuth session (needed by child components like FavoriteButton)
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock analytics
vi.mock('@/lib/analytics/queue', () => ({
  identifyUser: vi.fn(),
  clearUser: vi.fn(),
}))

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
