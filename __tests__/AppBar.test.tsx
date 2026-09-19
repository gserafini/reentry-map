import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@/__tests__/test-utils'
import { AppBar } from '@/components/layout/AppBar'
vi.mock('@/components/search/HeroSearch', () => ({
  HeroSearch: () => <form aria-label="Find resources" />,
}))

describe('app navigation', () => {
  it('mounts one search form only when requested', () => {
    const { rerender } = render(<AppBar showSearch={true} />)
    expect(screen.getAllByRole('form', { name: 'Find resources' })).toHaveLength(1)
    rerender(<AppBar showSearch={false} />)
    expect(screen.queryByRole('form', { name: 'Find resources' })).not.toBeInTheDocument()
  })
  it('opens a mobile menu containing the guest saved list', () => {
    render(<AppBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Saved resources' }).length).toBeGreaterThan(0)
  })
})
