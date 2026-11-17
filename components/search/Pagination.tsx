'use client'

import { Pagination as MuiPagination, PaginationItem, Box, Typography } from '@mui/material'
import { useSearchParams, usePathname } from 'next/navigation'

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
}

const resourceQueryKeys = [
  'search',
  'categories',
  'tags',
  'lat',
  'lng',
  'distance',
  'sort',
  'locationName',
  'north',
  'south',
  'east',
  'west',
  'city',
  'state',
]

function getAppliedQueryKeys(pathname: string): Set<string> {
  if (pathname === '/resources' || pathname === '/search') return new Set(resourceQueryKeys)
  if (/^\/category\/[^/]+\/?$/.test(pathname)) {
    return new Set(resourceQueryKeys.filter((key) => key !== 'categories'))
  }
  if (/^\/[^/]+\/[^/]+\/category\/[^/]+\/?$/.test(pathname)) {
    return new Set(['search', 'sort'])
  }
  if (/^\/[^/]+\/[^/]+\/?$/.test(pathname)) {
    return new Set(['search', 'categories', 'sort'])
  }
  return new Set()
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
export function Pagination({ currentPage, totalPages, totalCount, pageSize }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Calculate the range of items being shown
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    const allowedParams = getAppliedQueryKeys(pathname)
    for (const key of [...params.keys()]) {
      if (key !== 'page' && !allowedParams.has(key)) params.delete(key)
    }
    if (page <= 1) params.delete('page')
    else params.set('page', String(page))
    return params.size ? `${pathname}?${params.toString()}` : pathname
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
        color="primary"
        size="large"
        showFirstButton
        showLastButton
        siblingCount={1}
        boundaryCount={1}
        renderItem={(item) => {
          if (item.disabled || item.selected || item.page === null) {
            return <PaginationItem {...item} />
          }
          return <PaginationItem {...item} component="a" href={getPageUrl(item.page)} />
        }}
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
