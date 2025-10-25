'use client'

import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { ResourceSort } from '@/lib/types/database'

interface SortOption {
  value: string
  label: string
  field: ResourceSort['field']
  direction: ResourceSort['direction']
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: 'name-asc',
    label: 'Name (A-Z)',
    field: 'name',
    direction: 'asc',
  },
  {
    value: 'name-desc',
    label: 'Name (Z-A)',
    field: 'name',
    direction: 'desc',
  },
  {
    value: 'rating-desc',
    label: 'Rating (Highest First)',
    field: 'rating_average',
    direction: 'desc',
  },
  {
    value: 'rating-asc',
    label: 'Rating (Lowest First)',
    field: 'rating_average',
    direction: 'asc',
  },
  {
    value: 'date-desc',
    label: 'Date Added (Newest First)',
    field: 'created_at',
    direction: 'desc',
  },
  {
    value: 'date-asc',
    label: 'Date Added (Oldest First)',
    field: 'created_at',
    direction: 'asc',
  },
  {
    value: 'distance-asc',
    label: 'Distance (Nearest First)',
    field: 'distance',
    direction: 'asc',
  },
]

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

/**
 * Parse sort URL param into ResourceSort object
 * @param sortParam - Sort parameter from URL (e.g., 'rating-desc')
 * @returns ResourceSort object with field and direction
 */
export function parseSortParam(sortParam?: string | null): ResourceSort {
  const defaultSort: ResourceSort = { field: 'name', direction: 'asc' }

  if (!sortParam) return defaultSort

  const option = SORT_OPTIONS.find((opt) => opt.value === sortParam)
  if (!option) return defaultSort

  return {
    field: option.field,
    direction: option.direction,
  }
}
