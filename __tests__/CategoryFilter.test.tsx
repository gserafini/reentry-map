import { describe, it, expect, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  resetRouterMocks,
  setMockSearchParams,
  setMockPathname,
  getMockRouter,
} from '@/__tests__/test-utils'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import type { ResourceCategory } from '@/lib/types/database'

describe('CategoryFilter', () => {
  beforeEach(() => {
    resetRouterMocks()
    setMockPathname('/resources')
  })

  it('renders all categories', () => {
    render(<CategoryFilter />)

    expect(screen.getByText('Employment')).toBeInTheDocument()
    expect(screen.getByText('Housing')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Healthcare')).toBeInTheDocument()
  })

  it('displays category counts when provided', () => {
    const categoryCounts: Partial<Record<ResourceCategory, number>> = {
      employment: 25,
      housing: 15,
      food: 30,
    }

    render(<CategoryFilter categoryCounts={categoryCounts} />)

    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('displays 0 for categories without counts', () => {
    const categoryCounts: Partial<Record<ResourceCategory, number>> = {
      employment: 25,
    }

    render(<CategoryFilter categoryCounts={categoryCounts} />)

    // Should have many 0s for categories without resources
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThan(0)
  })

  it('toggles category selection', () => {
    render(<CategoryFilter />)

    const employmentCheckbox = screen.getByRole('checkbox', { name: /Filter by Employment/i })
    fireEvent.click(employmentCheckbox)

    // Single category selection uses SEO-friendly URL with search param
    expect(getMockRouter().push).toHaveBeenCalledWith(
      '/resources/category/employment?search=employment'
    )
  })

  it('handles multiple category selections', () => {
    // Start with one category selected
    setMockSearchParams({ categories: 'employment' })

    render(<CategoryFilter />)

    const housingCheckbox = screen.getByRole('checkbox', { name: /Filter by Housing/i })
    fireEvent.click(housingCheckbox)

    expect(getMockRouter().push).toHaveBeenCalledWith('/resources?categories=employment%2Chousing')
  })

  it('removes category when unchecked', () => {
    // Start with two categories selected
    setMockSearchParams({ categories: 'employment,housing' })

    render(<CategoryFilter />)

    const employmentCheckbox = screen.getByRole('checkbox', { name: /Filter by Employment/i })
    fireEvent.click(employmentCheckbox)

    // Removing one category from multiple leaves one, so uses SEO-friendly URL with search param
    expect(getMockRouter().push).toHaveBeenCalledWith('/resources/category/housing?search=housing')
  })

  it('shows active filters with chips', () => {
    setMockSearchParams({ categories: 'employment,housing' })

    render(<CategoryFilter />)

    expect(screen.getByText('Active filters:')).toBeInTheDocument()
    // Chips show category labels
    const chips = screen.getAllByRole('button', { name: /Employment|Housing/i })
    expect(chips.length).toBeGreaterThan(0)
  })

  it('clears all filters when Clear All is clicked', () => {
    setMockSearchParams({ categories: 'employment,housing' })

    render(<CategoryFilter />)

    const clearButton = screen.getByRole('button', { name: /Clear All/i })
    fireEvent.click(clearButton)

    expect(getMockRouter().push).toHaveBeenCalledWith('/resources')
  })

  it('can be collapsed and expanded', () => {
    render(<CategoryFilter />)

    const collapseButton = screen.getByLabelText('Collapse filters')
    fireEvent.click(collapseButton)

    const expandButton = screen.getByLabelText('Expand filters')
    expect(expandButton).toBeInTheDocument()

    fireEvent.click(expandButton)
    expect(screen.getByLabelText('Collapse filters')).toBeInTheDocument()
  })

  it('sets search param to category name when selecting category', () => {
    setMockSearchParams({ search: 'housing' })

    render(<CategoryFilter />)

    const employmentCheckbox = screen.getByRole('checkbox', { name: /Filter by Employment/i })
    fireEvent.click(employmentCheckbox)

    // Single category selection overwrites search param with category name
    expect(getMockRouter().push).toHaveBeenCalledWith(
      '/resources/category/employment?search=employment'
    )
  })

  it('supports accessibility', () => {
    render(<CategoryFilter />)

    // Filter heading
    expect(screen.getByRole('heading', { name: /Filter by Category/i })).toBeInTheDocument()

    // All checkboxes should have aria-labels
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAccessibleName()
    })
  })
})
