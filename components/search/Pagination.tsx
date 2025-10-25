'use client'

import { Pagination as MuiPagination, Box, Typography } from '@mui/material'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface PaginationProps {
  /**
   * Current page number (1-indexed)
   */
  currentPage: number

  /**
   * Total number of pages
   */
  totalPages: number

  /**
   * Total number of items (for displaying "Showing X-Y of Z")
   */
  totalCount: number

  /**
   * Number of items per page
   */
  pageSize: number

  /**
   * Whether to scroll to top when page changes
   * @default true
   */
  scrollToTop?: boolean

  /**
   * Element to scroll to when page changes
   * @default window
   */
  scrollTarget?: string
}

/**
 * Pagination component for resource lists
 *
 * Features:
 * - Material UI pagination with page numbers
 * - Previous/Next buttons
 * - Updates URL params automatically
 * - Scroll to top on page change (configurable)
 * - Shows "Showing X-Y of Z results"
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   totalPages={5}
 *   totalCount={100}
 *   pageSize={20}
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  scrollToTop = true,
  scrollTarget,
}: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Calculate the range of items being shown
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    // Create new search params with updated page
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      // Remove page param for page 1 (cleaner URLs)
      params.delete('page')
    } else {
      params.set('page', page.toString())
    }

    // Update URL
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)

    // Scroll to top or target element
    if (scrollToTop) {
      if (scrollTarget) {
        const element = document.querySelector(scrollTarget)
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  // Don't render if there's only one page or no results
  if (totalPages <= 1 || totalCount === 0) {
    return null
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        py: 3,
      }}
    >
      {/* Results count */}
      <Typography variant="body2" color="text.secondary">
        Showing {startItem}–{endItem} of {totalCount} result{totalCount !== 1 ? 's' : ''}
      </Typography>

      {/* Pagination controls */}
      <MuiPagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        color="primary"
        size="large"
        showFirstButton
        showLastButton
        siblingCount={1}
        boundaryCount={1}
        sx={{
          '& .MuiPaginationItem-root': {
            fontSize: '1rem',
            minWidth: '44px',
            height: '44px',
          },
        }}
      />
    </Box>
  )
}
