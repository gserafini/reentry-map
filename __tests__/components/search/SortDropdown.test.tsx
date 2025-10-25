import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortDropdown, parseSortParam } from '@/components/search/SortDropdown'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}))

describe('SortDropdown', () => {
  const mockPush = vi.fn()
  const mockPathname = '/search'
  const mockSearchParams = new URLSearchParams()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    })
    ;(usePathname as ReturnType<typeof vi.fn>).mockReturnValue(mockPathname)
    ;(useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams)

    // Clear localStorage
    localStorage.clear()
  })

  it('renders sort dropdown with default value', () => {
    render(<SortDropdown />)

    expect(screen.getByLabelText('Sort By')).toBeInTheDocument()
  })

  it('displays all sort options except distance by default', async () => {
    const user = userEvent.setup()
    render(<SortDropdown showDistanceSort={false} />)

    // Open the dropdown
    const select = screen.getByLabelText('Sort By')
    await user.click(select)

    // Check that standard options are present (use getAllByText to handle duplicates)
    expect(screen.getAllByText('Name (A-Z)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Name (Z-A)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rating (Highest First)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rating (Lowest First)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Date Added (Newest First)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Date Added (Oldest First)').length).toBeGreaterThan(0)

    // Distance option should NOT be present
    expect(screen.queryByText('Distance (Nearest First)')).not.toBeInTheDocument()
  })

  it('shows distance option when showDistanceSort is true', async () => {
    const user = userEvent.setup()
    render(<SortDropdown showDistanceSort={true} />)

    // Open the dropdown
    const select = screen.getByLabelText('Sort By')
    await user.click(select)

    // Distance option should be present
    expect(screen.getByText('Distance (Nearest First)')).toBeInTheDocument()
  })

  it('updates URL when sort option changes', async () => {
    const user = userEvent.setup()
    render(<SortDropdown />)

    // Open dropdown and select rating descending
    const select = screen.getByLabelText('Sort By')
    await user.click(select)

    const ratingOption = screen.getByText('Rating (Highest First)')
    await user.click(ratingOption)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/search?sort=rating-desc')
    })
  })

  it('removes page param when changing sort', async () => {
    const user = userEvent.setup()
    const searchParamsWithPage = new URLSearchParams('page=2')
    ;(useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(searchParamsWithPage)

    render(<SortDropdown />)

    // Open dropdown and select a sort option
    const select = screen.getByLabelText('Sort By')
    await user.click(select)

    const nameDesc = screen.getByText('Name (Z-A)')
    await user.click(nameDesc)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/search?sort=name-desc')
    })
  })

  it('saves preference to localStorage', async () => {
    const user = userEvent.setup()
    render(<SortDropdown />)

    // Open dropdown and select a sort option
    const select = screen.getByLabelText('Sort By')
    await user.click(select)

    const ratingOption = screen.getByText('Rating (Highest First)')
    await user.click(ratingOption)

    await waitFor(() => {
      expect(localStorage.getItem('preferredSort')).toBe('rating-desc')
    })
  })

  it('removes sort param when selecting default sort', async () => {
    const user = userEvent.setup()
    const searchParamsWithSort = new URLSearchParams('sort=rating-desc')
    ;(useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(searchParamsWithSort)

    render(<SortDropdown defaultSort="name-asc" />)

    // Open dropdown and select default sort (Name A-Z)
    const select = screen.getByLabelText('Sort By')
    await user.click(select)

    const nameAsc = screen.getByText('Name (A-Z)')
    await user.click(nameAsc)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/search')
    })
  })

  it('preserves other search params when changing sort', async () => {
    const user = userEvent.setup()
    const searchParamsWithCategory = new URLSearchParams('category=housing&page=2')
    ;(useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(searchParamsWithCategory)

    render(<SortDropdown />)

    // Open dropdown and select a sort option
    const select = screen.getByLabelText('Sort By')
    await user.click(select)

    const ratingOption = screen.getByText('Rating (Highest First)')
    await user.click(ratingOption)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/search?category=housing&sort=rating-desc')
    })
  })

  it('uses sort from URL params if present', () => {
    const searchParamsWithSort = new URLSearchParams('sort=rating-desc')
    ;(useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(searchParamsWithSort)

    render(<SortDropdown />)

    // The select should display the rating-desc option
    const select = screen.getByLabelText('Sort By')
    expect(select).toHaveTextContent('Rating (Highest First)')
  })

  it('falls back to localStorage if no URL param', () => {
    localStorage.setItem('preferredSort', 'name-desc')

    render(<SortDropdown />)

    const select = screen.getByLabelText('Sort By')
    expect(select).toHaveTextContent('Name (Z-A)')
  })

  it('uses default sort if no URL param or localStorage', () => {
    render(<SortDropdown defaultSort="rating-desc" />)

    const select = screen.getByLabelText('Sort By')
    expect(select).toHaveTextContent('Rating (Highest First)')
  })
})

describe('parseSortParam', () => {
  it('parses valid sort param correctly', () => {
    expect(parseSortParam('name-asc')).toEqual({ field: 'name', direction: 'asc' })
    expect(parseSortParam('name-desc')).toEqual({ field: 'name', direction: 'desc' })
    expect(parseSortParam('rating-desc')).toEqual({ field: 'rating_average', direction: 'desc' })
    expect(parseSortParam('rating-asc')).toEqual({ field: 'rating_average', direction: 'asc' })
    expect(parseSortParam('date-desc')).toEqual({ field: 'created_at', direction: 'desc' })
    expect(parseSortParam('date-asc')).toEqual({ field: 'created_at', direction: 'asc' })
    expect(parseSortParam('distance-asc')).toEqual({ field: 'distance', direction: 'asc' })
  })

  it('returns default sort for invalid param', () => {
    expect(parseSortParam('invalid')).toEqual({ field: 'name', direction: 'asc' })
    expect(parseSortParam('')).toEqual({ field: 'name', direction: 'asc' })
  })

  it('returns default sort for null/undefined param', () => {
    expect(parseSortParam(null)).toEqual({ field: 'name', direction: 'asc' })
    expect(parseSortParam(undefined)).toEqual({ field: 'name', direction: 'asc' })
  })
})
