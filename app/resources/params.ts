import type { ResourceCategory, ResourceSort } from '@/lib/types/database'
import { parseSortParam } from '@/lib/utils/sort'

export interface ResourcesPageSearchParams {
  search?: string
  categories?: string
  lat?: string
  lng?: string
  distance?: string
  sort?: string
}

export function buildResourcesQueryOptions(searchParams: ResourcesPageSearchParams): {
  search?: string
  categories?: ResourceCategory[]
  latitude?: number
  longitude?: number
  radius_miles?: number
  sort: ResourceSort
  isSearching: boolean
  isFiltering: boolean
} {
  const { search, categories: categoriesParam, lat, lng, distance, sort: sortParam } = searchParams

  const categories = categoriesParam
    ? (categoriesParam.split(',').filter(Boolean) as ResourceCategory[])
    : undefined

  const latitude = lat ? parseFloat(lat) : undefined
  const longitude = lng ? parseFloat(lng) : undefined
  const radius_miles = distance ? parseInt(distance, 10) : undefined

  const hasLocation =
    latitude !== undefined &&
    Number.isFinite(latitude) &&
    longitude !== undefined &&
    Number.isFinite(longitude) &&
    radius_miles !== undefined &&
    Number.isFinite(radius_miles)

  const sort: ResourceSort = sortParam
    ? parseSortParam(sortParam)
    : hasLocation
      ? { field: 'distance', direction: 'asc' }
      : parseSortParam(undefined)

  return {
    search,
    categories,
    ...(hasLocation ? { latitude, longitude, radius_miles } : {}),
    sort,
    isSearching: Boolean(search && search.trim()),
    isFiltering: Boolean(categories && categories.length > 0),
  }
}
