import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}))

import { CategoryDropdown } from '@/components/search/CategoryDropdown'

describe('CategoryDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders category menu items', () => {
    render(<CategoryDropdown />)
    // Should render at least some categories
    const items = screen.getAllByRole('menuitem')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(8) // Shows max 8
  })

  it('renders category labels', () => {
    render(<CategoryDropdown />)
    // Check for common categories
    expect(screen.getByText('Employment')).toBeInTheDocument()
    expect(screen.getByText('Housing')).toBeInTheDocument()
  })

  it('navigates to category page on click', () => {
    render(<CategoryDropdown />)
    const employmentItem = screen.getByText('Employment')
    fireEvent.click(employmentItem)
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/resources/category/'))
  })

  it('calls onSelect with category label when clicked', () => {
    const onSelect = vi.fn()
    render(<CategoryDropdown onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Employment'))
    expect(onSelect).toHaveBeenCalledWith('Employment')
  })

  it('calls onClose when clicked', () => {
    const onClose = vi.fn()
    render(<CategoryDropdown onClose={onClose} />)
    fireEvent.click(screen.getByText('Employment'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onHover when hovering over item', () => {
    const onHover = vi.fn()
    render(<CategoryDropdown onHover={onHover} />)
    const employmentItem = screen.getByText('Employment')
    fireEvent.mouseEnter(employmentItem.closest('[role="menuitem"]')!)
    expect(onHover).toHaveBeenCalledWith('Employment')
  })
})
