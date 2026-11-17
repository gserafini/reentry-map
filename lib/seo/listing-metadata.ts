import { buildResourcesQueryOptions, type ResourcesPageSearchParams } from '@/app/resources/params'
import { parsePageNumber } from '@/lib/utils/pagination'
import { SORT_OPTIONS } from '@/lib/utils/sort'

type ListingSearchParams = Record<string, string | string[] | undefined>

interface ListingMetadataOptions {
  /** The clean listing is useful as a search landing page. */
  curated: boolean
  /** Query keys that the route passes into its resource query. */
  appliedKeys?: string[]
}

interface ListingMetadata {
  alternates: { canonical: string }
  robots?: { index: false; follow: true }
}

const SITE_ORIGIN = 'https://reentrymap.org'
const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/**
 * Build deterministic metadata for curated listing pages and their query variants.
 * Query values are taken from the same parser used to build the resource request,
 * so canonical filters match the filters actually applied by the server.
 */
export function buildListingMetadata<T extends object>(
  pathname: string,
  searchParams: T,
  options: ListingMetadataOptions
): ListingMetadata {
  const params = searchParams as ListingSearchParams
  const resourceQuery = buildResourcesQueryOptions(params as ResourcesPageSearchParams)
  const query = new URLSearchParams()
  const appliedKeys = new Set(options.appliedKeys || [])
  const appliedValues: Record<string, string> = {}
  const categories = resourceQuery.categories ? [...resourceQuery.categories].sort().join(',') : ''
  const tags = resourceQuery.tags ? [...resourceQuery.tags].sort().join(',') : ''

  for (const key of [...appliedKeys].sort()) {
    const value = firstValue(params[key])

    if (key === 'search' && resourceQuery.search) {
      appliedValues.search = resourceQuery.search
    } else if (key === 'locationName' && resourceQuery.locationName) {
      appliedValues.locationName = resourceQuery.locationName
    } else if (key === 'categories' && categories) {
      appliedValues.categories = categories
    } else if (key === 'tags' && tags) {
      appliedValues.tags = tags
    } else if (key === 'sort' && value && SORT_VALUES.has(value)) {
      appliedValues.sort = value
    } else if (key === 'lat') {
      if (resourceQuery.latitude !== undefined && resourceQuery.longitude !== undefined) {
        appliedValues.lat = String(resourceQuery.latitude)
        appliedValues.lng = String(resourceQuery.longitude)
        appliedValues.distance = String(resourceQuery.radius_miles)
      }
    } else if (key === 'lng' || key === 'distance') {
      // Coordinates and distance are handled together by the `lat` branch.
      continue
    } else if (['north', 'south', 'east', 'west'].includes(key)) {
      const bounds = ['north', 'south', 'east', 'west'] as const
      if (bounds.every((bound) => typeof resourceQuery[bound] === 'number')) {
        for (const bound of bounds) appliedValues[bound] = String(resourceQuery[bound])
      }
    } else if (key === 'city' && resourceQuery.city) {
      appliedValues.city = resourceQuery.city
    } else if (key === 'state' && resourceQuery.state) {
      appliedValues.state = resourceQuery.state
    }
  }

  // These routes resolve their location from the path, so URL map coordinates
  // and viewport values are not used by the resource query.
  const pathHasLocation = /^\/[a-z]{2}(?:\/[^/]+)?(?:\/category\/[^/]+)?\/?$/i.test(pathname)
  const hasBounds = ['north', 'south', 'east', 'west'].every((key) => key in appliedValues)
  if (pathHasLocation) {
    for (const key of ['lat', 'lng', 'distance', 'north', 'south', 'east', 'west']) {
      delete appliedValues[key]
    }
  } else if (hasBounds) {
    delete appliedValues.lat
    delete appliedValues.lng
    delete appliedValues.distance
  }
  if (appliedValues.sort === 'distance-asc' && !appliedValues.lat) delete appliedValues.sort

  const page = parsePageNumber(firstValue(params.page))
  if (page > 1) appliedValues.page = String(page)

  for (const key of Object.keys(appliedValues).sort()) query.set(key, appliedValues[key])

  const hasAppliedFilters = Object.keys(appliedValues).some((key) => key !== 'page')
  const canonical = `${SITE_ORIGIN}${pathname}${query.size ? `?${query.toString()}` : ''}`
  return {
    alternates: { canonical },
    ...((!options.curated || hasAppliedFilters) && { robots: { index: false, follow: true } }),
  }
}

/** Return the same normalized self-canonical path and query used by page metadata. */
export function buildListingCanonicalPath<T extends object>(
  pathname: string,
  searchParams: T,
  options: ListingMetadataOptions
): string {
  const canonical = buildListingMetadata(pathname, searchParams, options).alternates.canonical
  const url = new URL(canonical)
  return `${url.pathname}${url.search}`
}
