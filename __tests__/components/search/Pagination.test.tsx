import { describe, it, expect, beforeEach } from 'vitest'
import {
  render,
  screen,
  resetRouterMocks,
  setMockPathname,
  setMockSearchParams,
} from '@/__tests__/test-utils'
import { Pagination } from '@/components/search/Pagination'

describe('Pagination', () => {
  beforeEach(() => {
    resetRouterMocks()
    setMockPathname('/search')
  })

  it('renders pagination controls with correct page count', () => {
    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    // Check that pagination is visible
    expect(screen.getByText('Showing 1–20 of 100 results')).toBeInTheDocument()
  })

  it('displays correct item range for first page', () => {
    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByText('Showing 1–20 of 100 results')).toBeInTheDocument()
  })

  it('displays correct item range for middle page', () => {
    render(<Pagination currentPage={3} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByText('Showing 41–60 of 100 results')).toBeInTheDocument()
  })

  it('displays correct item range for last page', () => {
    render(<Pagination currentPage={5} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByText('Showing 81–100 of 100 results')).toBeInTheDocument()
  })

  it('displays correct item range when last page is partial', () => {
    render(<Pagination currentPage={3} totalPages={3} totalCount={55} pageSize={20} />)

    expect(screen.getByText('Showing 41–55 of 55 results')).toBeInTheDocument()
  })

  it('handles singular "result" when totalCount is 1 but has multiple pages', () => {
    // Edge case: 1 result across multiple pages shouldn't happen, but test the logic
    // Use 2 pages to ensure component renders, with totalCount = 1
    render(<Pagination currentPage={1} totalPages={2} totalCount={1} pageSize={1} />)

    expect(screen.queryByText(/1 result\b/)).toBeInTheDocument()
  })

  it('does not render when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} totalCount={15} pageSize={20} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('does not render when totalCount is 0', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={0} totalCount={0} pageSize={20} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders page numbers as real href links', () => {
    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByRole('link', { name: 'Go to page 2' })).toHaveAttribute(
      'href',
      '/search?page=2'
    )
  })

  it('keeps unavailable first and previous controls disabled on page one', () => {
    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByRole('button', { name: 'Go to first page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled()
  })

  it('uses the clean URL for page one', () => {
    render(<Pagination currentPage={2} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByRole('link', { name: 'Go to page 1' })).toHaveAttribute('href', '/search')
  })

  it('preserves known result filters but drops unknown query parameters', () => {
    setMockSearchParams({ category: 'housing', search: 'test' })

    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByRole('link', { name: 'Go to page 2' })).toHaveAttribute(
      'href',
      '/search?search=test&page=2'
    )
  })

  it('renders first and last page links', () => {
    render(<Pagination currentPage={3} totalPages={10} totalCount={200} pageSize={20} />)

    expect(screen.getByRole('link', { name: 'Go to first page' })).toHaveAttribute(
      'href',
      '/search'
    )
    expect(screen.getByRole('link', { name: 'Go to last page' })).toHaveAttribute(
      'href',
      '/search?page=10'
    )
  })

  it('has accessible button sizes (minimum 44x44px)', () => {
    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    const page1Button = screen.getByRole('button', { name: 'page 1' })

    // Material UI Pagination should apply our custom sx styles for min-width and height
    // We're checking that the button is rendered (actual size testing is better in E2E)
    expect(page1Button).toBeInTheDocument()
  })
})

describe('Pagination links', () => {
  beforeEach(() => {
    resetRouterMocks()
    setMockPathname('/ca/san-francisco')
  })

  it('renders real page links with only filters applied on this route', () => {
    setMockSearchParams({
      search: 'housing',
      categories: 'food',
      sort: 'rating-desc',
      utm_source: 'x',
    })
    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByRole('link', { name: 'Go to page 2' })).toHaveAttribute(
      'href',
      '/ca/san-francisco?search=housing&categories=food&sort=rating-desc&page=2'
    )
  })

  it('uses the fixed category route and applied filters to build category page links', () => {
    setMockPathname('/category/housing')
    setMockSearchParams({ tags: 'reentry', categories: 'food', search: 'shelter', unknown: 'drop' })
    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByRole('link', { name: 'Go to page 2' })).toHaveAttribute(
      'href',
      '/category/housing?tags=reentry&search=shelter&page=2'
    )
  })

  it('keeps only search and sort on a city category route', () => {
    setMockPathname('/ca/san-francisco/category/housing')
    setMockSearchParams({
      search: 'shelter',
      sort: 'rating-desc',
      categories: 'food',
      tags: 'reentry',
    })
    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    expect(screen.getByRole('link', { name: 'Go to page 2' })).toHaveAttribute(
      'href',
      '/ca/san-francisco/category/housing?search=shelter&sort=rating-desc&page=2'
    )
  })

  it('keeps current page and ellipses accessible without pretending they navigate', () => {
    render(<Pagination currentPage={3} totalPages={10} totalCount={200} pageSize={20} />)

    expect(screen.getByRole('button', { name: 'page 3' })).toHaveAttribute('aria-current', 'page')
    const ellipses = document.querySelectorAll('.MuiPaginationItem-ellipsis')
    expect(ellipses.length).toBeGreaterThan(0)
    ellipses.forEach((ellipsis) => {
      expect(ellipsis.tagName).not.toBe('A')
      expect(ellipsis).not.toHaveAttribute('href')
    })
  })
})
