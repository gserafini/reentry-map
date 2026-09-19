'use client'

import { recordSearchRefinement } from '@/lib/analytics/search-journey'

import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { SORT_OPTIONS } from '@/lib/utils/sort'

interface SortDropdownProps {
  /**
   * Whether to show the distance sort option
   * Only show when user location is available
   */
  showDistanceSort?: boolean

  /**
   * Default sort option (optional)
   * Defaults to 'name-asc'
   */
  defaultSort?: string

  /**
   * Display variant
   * - 'standard': FormControl with label (default)
   * - 'inline': Minimal inline style like "Sort: Recommended"
   */
  variant?: 'standard' | 'inline'
}

/**
 * Sort dropdown component for resource listings
 *
 * Features:
 * - Material UI Select with sort options
 * - Updates URL params automatically
 * - Persists sort preference in localStorage
 * - Keyboard accessible
 * - Shows/hides distance sort based on location availability
 *
 * @example
 * ```tsx
 * <SortDropdown showDistanceSort={hasUserLocation} />
 * ```
 */
export function SortDropdown({
  showDistanceSort = false,
  defaultSort,
  variant = 'standard',
}: SortDropdownProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const effectiveDefault =
    defaultSort || (searchParams.get('search')?.trim() ? 'relevance' : 'name-asc')
  const showRelevance = Boolean(searchParams.get('search')?.trim())
  // The visible order must describe the server query, never a device-only preference.
  const requestedSort = searchParams.get('sort') || effectiveDefault
  const currentSort = SORT_OPTIONS.some(
    (option) => option.value === requestedSort && (showDistanceSort || option.field !== 'distance')
  )
    ? requestedSort
    : effectiveDefault

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    recordSearchRefinement('sort')
    const sortValue = event.target.value

    // Save preference to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('preferredSort', sortValue)
      } catch {
        /* Optional preference. */
      }
    }

    // Create new search params with updated sort
    const params = new URLSearchParams(searchParams.toString())
    if (sortValue === effectiveDefault) {
      // Remove sort param if it's the default
      params.delete('sort')
    } else {
      params.set('sort', sortValue)
    }

    // Reset to page 1 when changing sort
    params.delete('page')

    // Update URL
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)
  }

  // Filter sort options based on whether distance is available
  const availableSortOptions = SORT_OPTIONS.filter(
    (option) =>
      (showDistanceSort || option.field !== 'distance') &&
      (showRelevance || option.field !== 'relevance')
  )

  // Inline variant - Yelp style
  if (variant === 'inline') {
    return (
      <FormControl
        size="small"
        sx={{
          minWidth: 150,
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
          '& .MuiSelect-select': {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'text.primary',
            py: 0.5,
            px: 1,
          },
          '& .MuiSelect-icon': {
            color: 'text.secondary',
          },
        }}
      >
        <Select
          id="sort-select-inline"
          inputProps={{ 'aria-label': 'Sort results' }}
          value={currentSort}
          onChange={handleSortChange}
          renderValue={(value) => {
            const label =
              availableSortOptions.find((opt) => opt.value === value)?.label || 'Name (A-Z)'
            return `Sort: ${label}`
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                mt: 0.5,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              },
            },
          }}
        >
          {availableSortOptions.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              sx={{
                fontSize: '0.875rem',
                py: 1.5,
                px: 2,
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }

  // Standard variant - FormControl with label
  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel id="sort-select-label">Sort By</InputLabel>
      <Select
        labelId="sort-select-label"
        id="sort-select"
        value={currentSort}
        label="Sort By"
        onChange={handleSortChange}
        sx={{
          '& .MuiSelect-select': {
            py: 1.5,
          },
        }}
      >
        {availableSortOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
