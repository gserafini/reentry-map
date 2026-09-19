import type { ResourceCategory, ResourceSort } from '@/lib/types/database'
import { parseSortParam } from '@/lib/utils/sort'
import { resolveSearchLocation } from '@/lib/utils/search-location'
import { getAllCategories } from '@/lib/utils/categories'

export interface ResourcesPageSearchParams {
  search?: string
  categories?: string
  tags?: string
  lat?: string
  lng?: string
  distance?: string
  sort?: string
  locationName?: string
  north?: string
  south?: string
  east?: string
  west?: string
  city?: string
  state?: string
  page?: string
}

export function buildResourcesQueryOptions(searchParams: ResourcesPageSearchParams) {
  const urlParams = new URLSearchParams(
    Object.entries(searchParams).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  )
  const location = resolveSearchLocation(urlParams)
  const validCategories = getAllCategories()
  const selected = (searchParams.categories || '')
    .split(',')
    .filter((category): category is ResourceCategory =>
      validCategories.includes(category as ResourceCategory)
    )
  const categories = selected.length ? [...new Set(selected)] : undefined
  const tags = [
    ...new Set(
      (searchParams.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ].slice(0, 20)
  const sort: ResourceSort = searchParams.sort
    ? parseSortParam(searchParams.sort)
    : searchParams.search?.trim()
      ? { field: 'relevance', direction: 'asc' }
      : location.coordinates
        ? { field: 'distance', direction: 'asc' }
        : parseSortParam(undefined)
  return {
    search: searchParams.search?.trim() || undefined,
    categories,
    tags: tags.length ? tags : undefined,
    locationName: location.locationName,
    ...(location.city ? { city: location.city } : {}),
    ...(location.state ? { state: location.state } : {}),
    ...(location.viewportBounds || {}),
    ...(location.coordinates
      ? { ...location.coordinates, radius_miles: location.radiusMiles }
      : {}),
    sort: !location.coordinates && sort.field === 'distance' ? parseSortParam(undefined) : sort,
    isSearching: Boolean(searchParams.search?.trim()),
    isFiltering: Boolean(categories?.length || tags.length),
  }
}
