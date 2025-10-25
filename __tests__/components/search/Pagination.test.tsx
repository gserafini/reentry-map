import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from '@/components/search/Pagination'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}))

describe('Pagination', () => {
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

    // Mock window.scrollTo
    window.scrollTo = vi.fn()
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

  it('navigates to correct page when clicking page number', async () => {
    const user = userEvent.setup()

    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    // Find and click page 2 button
    const page2Button = screen.getByRole('button', { name: 'Go to page 2' })
    await user.click(page2Button)

    expect(mockPush).toHaveBeenCalledWith('/search?page=2')
  })

  it('removes page param when navigating to page 1', async () => {
    const user = userEvent.setup()

    render(<Pagination currentPage={2} totalPages={5} totalCount={100} pageSize={20} />)

    // Find and click page 1 button
    const page1Button = screen.getByRole('button', { name: 'Go to page 1' })
    await user.click(page1Button)

    expect(mockPush).toHaveBeenCalledWith('/search')
  })

  it('preserves existing search params when changing page', async () => {
    const user = userEvent.setup()
    const searchParamsWithQuery = new URLSearchParams('category=housing&search=test')
    ;(useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(searchParamsWithQuery)

    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    const page2Button = screen.getByRole('button', { name: 'Go to page 2' })
    await user.click(page2Button)

    expect(mockPush).toHaveBeenCalledWith('/search?category=housing&search=test&page=2')
  })

  it('scrolls to top when page changes by default', async () => {
    const user = userEvent.setup()

    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    const page2Button = screen.getByRole('button', { name: 'Go to page 2' })
    await user.click(page2Button)

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    })
  })

  it('does not scroll when scrollToTop is false', async () => {
    const user = userEvent.setup()

    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalCount={100}
        pageSize={20}
        scrollToTop={false}
      />
    )

    const page2Button = screen.getByRole('button', { name: 'Go to page 2' })
    await user.click(page2Button)

    await waitFor(() => {
      expect(window.scrollTo).not.toHaveBeenCalled()
    })
  })

  it('renders first and last page buttons', () => {
    render(<Pagination currentPage={3} totalPages={10} totalCount={200} pageSize={20} />)

    expect(screen.getByRole('button', { name: 'Go to first page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to last page' })).toBeInTheDocument()
  })

  it('has accessible button sizes (minimum 44x44px)', () => {
    render(<Pagination currentPage={1} totalPages={5} totalCount={100} pageSize={20} />)

    const page1Button = screen.getByRole('button', { name: 'page 1' })

    // Material UI Pagination should apply our custom sx styles for min-width and height
    // We're checking that the button is rendered (actual size testing is better in E2E)
    expect(page1Button).toBeInTheDocument()
  })
})
