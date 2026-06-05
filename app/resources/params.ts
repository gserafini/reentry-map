import type { ResourceCategory, ResourceSort } from '@/lib/types/database'
import { parseSortParam } from '@/lib/utils/sort'
import { parseStateLocationName } from '@/lib/utils/location-scope'
import { parseViewportBounds } from '@/lib/utils/map-viewport'

export interface ResourcesPageSearchParams {
  search?: string
  categories?: string
  lat?: string
  lng?: string
  distance?: string
  sort?: string
  locationName?: string
  north?: string
  south?: string
  east?: string
  west?: string
}

export function buildResourcesQueryOptions(searchParams: ResourcesPageSearchParams): {
  search?: string
  categories?: ResourceCategory[]
  latitude?: number
  longitude?: number
  radius_miles?: number
  state?: string
  north?: number
  south?: number
  east?: number
  west?: number
  sort: ResourceSort
  isSearching: boolean
  isFiltering: boolean
} {
  const {
    search,
    categories: categoriesParam,
    lat,
    lng,
    distance,
    sort: sortParam,
    locationName,
    north,
    south,
    east,
    west,
  } = searchParams

  const categories = categoriesParam
    ? (categoriesParam.split(',').filter(Boolean) as ResourceCategory[])
    : undefined

  const state = parseStateLocationName(locationName)
  const viewportBounds = parseViewportBounds(
    new URLSearchParams(
      Object.entries({ north, south, east, west }).filter(([, value]) => value != null) as [
        string,
        string,
      ][]
    )
  )
  const latitude = lat ? parseFloat(lat) : undefined
  const longitude = lng ? parseFloat(lng) : undefined
  const radius_miles = distance ? parseInt(distance, 10) : undefined

  const hasLocation =
    !state &&
    !viewportBounds &&
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
    ...(state ? { state } : {}),
    ...(viewportBounds || {}),
    ...(hasLocation ? { latitude, longitude, radius_miles } : {}),
    sort,
    isSearching: Boolean(search && search.trim()),
    isFiltering: Boolean(categories && categories.length > 0),
  }
}
