'use client'

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
  defaultSort = 'name-asc',
  variant = 'standard',
}: SortDropdownProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get current sort from URL params or localStorage
  const currentSort =
    searchParams.get('sort') ||
    (typeof window !== 'undefined' ? localStorage.getItem('preferredSort') : null) ||
    defaultSort

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    const sortValue = event.target.value

    // Save preference to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredSort', sortValue)
    }

    // Create new search params with updated sort
    const params = new URLSearchParams(searchParams.toString())
    if (sortValue === defaultSort) {
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
  const availableSortOptions = showDistanceSort
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((option) => option.field !== 'distance')

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
