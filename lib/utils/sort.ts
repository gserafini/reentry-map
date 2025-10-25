import type { ResourceSort } from '@/lib/types/database'

interface SortOption {
  value: string
  label: string
  field: ResourceSort['field']
  direction: ResourceSort['direction']
}

export const SORT_OPTIONS: SortOption[] = [
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
