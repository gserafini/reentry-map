import { describe, expect, it, vi } from 'vitest'
import { render, screen, setMockPathname } from '@/__tests__/test-utils'
import { ClientAppBar } from '@/components/layout/ClientAppBar'
vi.mock('@/components/search/HeroSearch', () => ({
  HeroSearch: () => <form aria-label="Find resources" />,
}))
describe('task-focused page navigation', () => {
  it.each(['/favorites', '/offline', '/profile', '/auth/login', '/suggest-resource', '/admin'])(
    'keeps search out of the way on %s',
    (path) => {
      setMockPathname(path)
      render(<ClientAppBar />)
      expect(screen.queryByRole('form', { name: 'Find resources' })).not.toBeInTheDocument()
    }
  )
  it.each(['/resources', '/search', '/category/housing', '/tx/dallas'])(
    'keeps search available while browsing %s',
    (path) => {
      setMockPathname(path)
      render(<ClientAppBar />)
      expect(screen.getByRole('form', { name: 'Find resources' })).toBeInTheDocument()
    }
  )
})
