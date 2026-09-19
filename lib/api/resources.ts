/**
 * One matching pipeline for lists, maps, totals and facets.
 * User values are always bound parameters; service eligibility is separate from map anchors.
 */
import { cache } from 'react'
import type { PendingQuery, Row } from 'postgres'
import { sql as sqlClient } from '@/lib/db/client'
import type {
  Resource,
  ResourceFilters,
  ResourceWithDistance,
  PaginationParams,
  ResourceSort,
  ResourceCategory,
} from '@/lib/types/database'
import { interpretSearch, escapeSearchPattern } from '@/lib/utils/search-intent'
import { matchesServiceCoverage } from '@/lib/utils/service-coverage'
import { normalizeServiceArea } from '@/lib/utils/resource-location'
import {
  resolveSearchGeography,
  resolveCityCounties,
  resolveViewportGeographies,
} from '@/lib/server/search-geography'

export interface GetResourcesOptions extends Partial<ResourceFilters>, PaginationParams {
  sort?: ResourceSort
  city?: string
  state?: string
  locationName?: string
}
export interface ResourceMapItem {
  id: string
  name: string
  primary_category: string
  address: string
  latitude: number | null
  longitude: number | null
  slug: string | null
  city: string | null
  state: string | null
  county?: string | null
  county_fips?: string | null
  address_type?: string | null
  service_area?: { type?: string | null; values?: string[] | null } | null
}
type SqlFragment = PendingQuery<Row[]>
const ALLOWED_SORT_FIELDS = [
  'name',
  'created_at',
  'updated_at',
  'rating_average',
  'distance',
] as const
const combineConditions = (conditions: SqlFragment[]) =>
  conditions.reduce((a, b) => sqlClient`${a} AND ${b}`)
const finite = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value)
function hasPoint(options: GetResourcesOptions): boolean {
  return (
    finite(options.latitude) &&
    finite(options.longitude) &&
    Math.abs(options.latitude!) <= 90 &&
    Math.abs(options.longitude!) <= 180
  )
}
function hasBounds(options: GetResourcesOptions): boolean {
  return [options.north, options.south, options.east, options.west].every(finite)
}

/** PostGIS handles coincident points without the acos rounding failure in the legacy RPC. */
function distanceMiles(options: GetResourcesOptions): SqlFragment {
  return sqlClient`ST_DistanceSphere(ST_MakePoint(${options.longitude!}, ${options.latitude!}), ST_MakePoint(longitude, latitude)) / 1609.344`
}

/** Within-request cache shares the geographic candidate set across list, count, map and facets. */
const geographicIds = cache(async (key: string): Promise<string[] | undefined> => {
  const options = JSON.parse(key) as GetResourcesOptions
  const point = hasPoint(options)
  const radius = point && finite(options.radius_miles) && options.radius_miles! > 0
  const bounds = hasBounds(options)
  if (!radius && !bounds && !options.city && !options.state) return undefined
  const physicalConditions = [
    sqlClient`status = 'active'`,
    sqlClient`COALESCE(address_type,'physical') = 'physical'`,
  ]
  if (options.city) physicalConditions.push(sqlClient`LOWER(city) = LOWER(${options.city})`)
  if (options.state)
    physicalConditions.push(sqlClient`UPPER(state) = ${options.state.toUpperCase()}`)
  if (bounds) {
    const longitudeCondition =
      options.west! <= options.east!
        ? sqlClient`longitude BETWEEN ${options.west!} AND ${options.east!}`
        : sqlClient`(longitude >= ${options.west!} OR longitude <= ${options.east!})`
    physicalConditions.push(
      sqlClient`latitude BETWEEN ${options.south!} AND ${options.north!} AND ${longitudeCondition}`
    )
  }
  if (radius)
    physicalConditions.push(sqlClient`${distanceMiles(options)} <= ${options.radius_miles!}`)
  let area = resolveSearchGeography(
    options.locationName || '',
    point ? options.latitude : undefined,
    point ? options.longitude : undefined,
    options.state,
    options.city
  )
  const [physical, services] = await Promise.all([
    sqlClient<
      {
        id: string
        city: string | null
        state: string | null
        latitude: number | null
        longitude: number | null
      }[]
    >`SELECT id, city, state, latitude, longitude FROM resources WHERE ${combineConditions(physicalConditions)}`,
    sqlClient<
      { id: string; city: string | null; state: string | null; service_area: unknown }[]
    >`SELECT id,city,state,service_area FROM resources WHERE status='active' AND COALESCE(address_type,'physical') <> 'physical'`,
  ])
  if (options.city && !point && !bounds) area = resolveCityCounties(area, physical)
  const viewportAreas = bounds
    ? resolveViewportGeographies({
        north: options.north!,
        south: options.south!,
        west: options.west!,
        east: options.east!,
      }).filter((candidate) => !options.state || candidate.state === options.state.toUpperCase())
    : []
  if (bounds) {
    // City boundaries are not bundled. A real physical address in the viewport
    // can establish city overlap; nonphysical display anchors cannot.
    const observedCities = new Set<string>()
    for (const resource of physical) {
      if (
        !resource.city ||
        !resource.state ||
        resource.latitude === null ||
        resource.longitude === null
      )
        continue
      const cityKey = resource.state.toUpperCase() + ':' + resource.city.trim().toLowerCase()
      if (observedCities.has(cityKey)) continue
      const cityArea = resolveSearchGeography(
        '',
        resource.latitude,
        resource.longitude,
        resource.state.toUpperCase(),
        resource.city
      )
      if (
        cityArea.countyFips &&
        viewportAreas.some((candidate) => candidate.countyFips === cityArea.countyFips)
      ) {
        observedCities.add(cityKey)
        viewportAreas.push(cityArea)
      }
    }
  }
  const matchingServices = services.filter((resource) => {
    if (bounds)
      return viewportAreas.some((candidate) => matchesServiceCoverage(resource, candidate))
    // A state browse includes local services within that state as well as statewide/national coverage.
    const coverage = normalizeServiceArea(resource.service_area)
    if (!coverage) {
      // An address-free local listing remains discoverable by its declared city/state.
      // This is not evidence that its service area covers a radius or a map anchor.
      const sameState = Boolean(
        area.state && resource.state?.trim().toUpperCase() === area.state.trim().toUpperCase()
      )
      const stateBrowse = options.state && !options.city && !radius && !bounds
      const sameCity = Boolean(
        area.city && resource.city?.trim().toLowerCase() === area.city.trim().toLowerCase()
      )
      return sameState && (Boolean(stateBrowse) || sameCity)
    }
    const localCoverage =
      coverage && ['city', 'county', 'region'].includes(coverage.type.toLowerCase())
    if (
      options.state &&
      !options.city &&
      !radius &&
      !bounds &&
      localCoverage &&
      resource.state?.toUpperCase() === options.state.toUpperCase()
    )
      return true
    return matchesServiceCoverage(resource, area)
  })
  return [...new Set([...physical.map((r) => r.id), ...matchingServices.map((r) => r.id)])]
})

async function buildResourceConditions(opts: GetResourcesOptions): Promise<SqlFragment[]> {
  const conditions: SqlFragment[] = [sqlClient`status = 'active'`]
  const ids = await geographicIds(
    JSON.stringify({
      latitude: opts.latitude,
      longitude: opts.longitude,
      radius_miles: opts.radius_miles,
      north: opts.north,
      south: opts.south,
      east: opts.east,
      west: opts.west,
      city: opts.city,
      state: opts.state,
      locationName: opts.locationName,
    })
  )
  // An empty eligible set must remain empty, never become an unbounded search.
  if (ids !== undefined) conditions.push(sqlClient`id = ANY(${ids}::uuid[])`)
  if (opts.categories?.length)
    conditions.push(
      sqlClient`(primary_category = ANY(${opts.categories}::text[]) OR categories && ${opts.categories}::text[])`
    )
  if (opts.tags?.length) conditions.push(sqlClient`tags @> ${opts.tags}::text[]`)
  const intent = interpretSearch(opts.search)
  if (intent.query) {
    const literal = '%' + escapeSearchPattern(intent.query) + '%'
    const exactName = sqlClient`name ILIKE ${literal}`
    const terms = intent.terms.map((term) => {
      const pattern = '%' + escapeSearchPattern(term) + '%'
      return sqlClient`(name ILIKE ${pattern} OR description ILIKE ${pattern} OR array_to_string(services_offered,' ') ILIKE ${pattern} OR primary_category ILIKE ${pattern} OR array_to_string(categories,' ') ILIKE ${pattern})`
    })
    if (intent.categories.length) {
      const category = sqlClient`(primary_category = ANY(${intent.categories}::text[]) OR categories && ${intent.categories}::text[])`
      conditions.push(
        intent.specific && terms.length
          ? sqlClient`(${exactName} OR (${category} AND ${combineConditions(terms)}))`
          : sqlClient`(${exactName} OR ${category})`
      )
    } else if (terms.length)
      conditions.push(sqlClient`(${exactName} OR (${combineConditions(terms)}))`)
  }
  if (opts.min_rating !== undefined)
    conditions.push(sqlClient`rating_average >= ${opts.min_rating}`)
  if (opts.verified_only) conditions.push(sqlClient`verified = true`)
  if (opts.accepts_records != null)
    conditions.push(sqlClient`accepts_records = ${opts.accepts_records}`)
  if (opts.appointment_required != null)
    conditions.push(sqlClient`appointment_required = ${opts.appointment_required}`)
  return conditions
}
function errorResult(error: unknown) {
  return { data: null, error: error instanceof Error ? error : new Error('Unknown error') }
}
export async function getResources(options: GetResourcesOptions = {}): Promise<{
  data: (Resource & { distance?: number; coverage_match?: boolean })[] | null
  error: Error | null
}> {
  try {
    const where = combineConditions(await buildResourceConditions(options))
    const point = hasPoint(options)
    const query = interpretSearch(options.search).query
    const sort = options.sort || {
      field: query ? 'relevance' : point ? 'distance' : 'name',
      direction: 'asc',
    }
    const recommended = sort.field === 'relevance'
    const sortField = recommended
      ? point
        ? 'distance'
        : 'name'
      : (ALLOWED_SORT_FIELDS as readonly string[]).includes(sort.field) &&
          (sort.field !== 'distance' || point)
        ? sort.field
        : 'name'
    const direction = sort.direction === 'desc' ? 'DESC' : 'ASC'
    const distance = point
      ? sqlClient`CASE WHEN COALESCE(address_type,'physical')='physical' AND latitude IS NOT NULL AND longitude IS NOT NULL THEN ${distanceMiles(options)} ELSE NULL END`
      : sqlClient`NULL::double precision`
    const rank =
      query && recommended
        ? sqlClient`CASE WHEN LOWER(name)=LOWER(${query}) THEN 0 WHEN name ILIKE ${escapeSearchPattern(query) + '%'} THEN 1 ELSE 2 END`
        : sqlClient`0::integer`
    const data = await sqlClient<(Resource & { distance: number | null })[]>`
      SELECT *, ${distance} AS distance FROM resources WHERE ${where}
      ORDER BY ${rank}, ${sqlClient.unsafe(sortField)} ${sqlClient.unsafe(direction)} NULLS LAST, name ASC, id ASC
      LIMIT ${Math.max(1, Math.min(options.limit || 50, 5000))} OFFSET ${Math.max(0, options.offset || 0)}
    `
    return {
      data: data.map(({ distance, ...r }) => ({
        ...r,
        ...(distance !== null ? { distance: Number(distance) } : {}),
        coverage_match:
          (r.address_type || 'physical') !== 'physical' &&
          Boolean(normalizeServiceArea(r.service_area)),
      })),
      error: null,
    }
  } catch (error) {
    console.error('getResources failed:', error)
    return errorResult(error)
  }
}
export async function getResourcesForMap(
  options: Omit<GetResourcesOptions, 'offset' | 'sort'> = {},
  limit = 5000
): Promise<{ data: ResourceMapItem[] | null; error: Error | null }> {
  try {
    const where = combineConditions(await buildResourceConditions(options))
    const data = await sqlClient<ResourceMapItem[]>`
      SELECT id,name,primary_category,address,latitude,longitude,slug,city,state,county,county_fips,address_type,service_area
      FROM resources WHERE ${where} ORDER BY name,id LIMIT ${Math.max(1, Math.min(limit, 5000))}
    `
    return { data, error: null }
  } catch (error) {
    console.error('getResourcesForMap failed:', error)
    return errorResult(error)
  }
}
export async function getResourceById(
  id: string
): Promise<{ data: Resource | null; error: Error | null }> {
  try {
    const result = await sqlClient<Resource[]>`SELECT * FROM resources WHERE id=${id} LIMIT 1`
    return result[0]
      ? { data: result[0], error: null }
      : { data: null, error: new Error('Resource not found') }
  } catch (error) {
    return errorResult(error)
  }
}
export async function getResourcesNear(
  latitude: number,
  longitude: number,
  radiusMiles = 10
): Promise<{ data: ResourceWithDistance[] | null; error: Error | null }> {
  const result = await getResources({ latitude, longitude, radius_miles: radiusMiles })
  return {
    data:
      result.data
        ?.filter((r): r is Resource & { distance: number } => r.distance !== undefined)
        .map((r) => ({ id: r.id, name: r.name, address: r.address, distance: r.distance })) || null,
    error: result.error,
  }
}
export async function getResourcesByCategory(category: ResourceCategory, limit = 50) {
  return getResources({ categories: [category], limit })
}
export async function searchResources(query: string, limit = 50) {
  return getResources({ search: query, limit })
}
export async function getResourceCount() {
  return getResourcesCount()
}
export async function getResourcesCount(
  options: Omit<GetResourcesOptions, 'limit' | 'offset' | 'page'> = {}
): Promise<{ data: number | null; error: Error | null }> {
  try {
    const where = combineConditions(await buildResourceConditions(options))
    const result = await sqlClient<
      { count: string }[]
    >`SELECT COUNT(*) AS count FROM resources WHERE ${where}`
    return { data: Number(result[0]?.count || 0), error: null }
  } catch (error) {
    console.error('getResourcesCount failed:', error)
    return errorResult(error)
  }
}
export async function getCategoryCounts(
  options: GetResourcesOptions = {}
): Promise<{ data: Partial<Record<ResourceCategory, number>> | null; error: Error | null }> {
  try {
    const where = combineConditions(await buildResourceConditions(options))
    const data = await sqlClient<
      { primary_category: ResourceCategory; categories: ResourceCategory[] | null }[]
    >`SELECT primary_category,categories FROM resources WHERE ${where}`
    const counts: Partial<Record<ResourceCategory, number>> = {}
    for (const resource of data) {
      for (const category of new Set(
        [resource.primary_category, ...(resource.categories || [])].filter(Boolean)
      ))
        counts[category] = (counts[category] || 0) + 1
    }
    return { data: counts, error: null }
  } catch (error) {
    console.error('getCategoryCounts failed:', error)
    return errorResult(error)
  }
}
