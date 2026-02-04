/**
 * Resource API - Drizzle ORM Implementation
 *
 * Server-side data fetching using postgres.js with self-hosted PostgreSQL.
 * Uses raw SQL queries to maintain compatibility with existing snake_case types.
 */

import { sql as sqlClient } from '@/lib/db/client'
import type {
  Resource,
  ResourceFilters,
  ResourceWithDistance,
  PaginationParams,
  ResourceSort,
  ResourceCategory,
} from '@/lib/types/database'

export interface GetResourcesOptions extends Partial<ResourceFilters>, PaginationParams {
  sort?: ResourceSort
  city?: string
  state?: string
}

// Allowlist for ORDER BY field validation (safe to use with sql.unsafe since values are validated)
const ALLOWED_SORT_FIELDS = [
  'name',
  'created_at',
  'updated_at',
  'rating_average',
  'distance',
] as const

type SqlFragment = ReturnType<typeof sqlClient>

/**
 * Build parameterized WHERE conditions shared by getResources, getResourcesCount, and getCategoryCounts.
 *
 * Returns an array of postgres.js tagged template fragments. All user-supplied values are
 * passed through parameterized queries -- never concatenated into SQL strings.
 *
 * @param opts           - The filter options
 * @param resourceIds    - Optional array of resource IDs (from location-based pre-filter)
 * @param includeSearch  - Whether to include primary_category in the search ILIKE (location path does)
 */
function buildResourceConditions(
  opts: {
    search?: string
    categories?: ResourceCategory[]
    tags?: string[]
    city?: string
    state?: string
    min_rating?: number
    verified_only?: boolean
    accepts_records?: boolean | null
    appointment_required?: boolean | null
  },
  resourceIds?: string[],
  includeSearch: 'with_primary_category' | 'without_primary_category' = 'without_primary_category'
): SqlFragment[] {
  const conditions: SqlFragment[] = [sqlClient`status = 'active'`]

  if (resourceIds && resourceIds.length > 0) {
    conditions.push(sqlClient`id = ANY(${resourceIds}::uuid[])`)
  }

  if (opts.categories && opts.categories.length > 0) {
    // Use overlap operator (&&) when combined with location (matches any), containment (@>) otherwise
    if (resourceIds) {
      conditions.push(sqlClient`categories && ${opts.categories}::text[]`)
    } else {
      conditions.push(sqlClient`categories @> ${opts.categories}::text[]`)
    }
  }

  if (opts.tags && opts.tags.length > 0) {
    conditions.push(sqlClient`tags @> ${opts.tags}::text[]`)
  }

  if (opts.search && opts.search.trim()) {
    const pattern = '%' + opts.search + '%'
    if (includeSearch === 'with_primary_category') {
      conditions.push(
        sqlClient`(name ILIKE ${pattern} OR description ILIKE ${pattern} OR primary_category ILIKE ${pattern})`
      )
    } else {
      conditions.push(sqlClient`(name ILIKE ${pattern} OR description ILIKE ${pattern})`)
    }
  }

  if (opts.min_rating !== undefined) {
    conditions.push(sqlClient`rating_average >= ${opts.min_rating}`)
  }

  if (opts.verified_only) {
    conditions.push(sqlClient`verified = true`)
  }

  if (opts.accepts_records != null) {
    conditions.push(sqlClient`accepts_records = ${opts.accepts_records}`)
  }

  if (opts.appointment_required != null) {
    conditions.push(sqlClient`appointment_required = ${opts.appointment_required}`)
  }

  if (opts.city) {
    conditions.push(sqlClient`city = ${opts.city}`)
  }

  if (opts.state) {
    conditions.push(sqlClient`state = ${opts.state}`)
  }

  return conditions
}

/**
 * Combine an array of postgres.js fragment conditions with AND.
 */
function combineConditions(conditions: SqlFragment[]): SqlFragment {
  return conditions.reduce((acc, cond, i) => (i === 0 ? cond : sqlClient`${acc} AND ${cond}`))
}

/**
 * Get all resources with filtering, pagination, and sorting
 */
export async function getResources(
  options: GetResourcesOptions = {}
): Promise<{ data: (Resource & { distance?: number })[] | null; error: Error | null }> {
  try {
    const {
      search,
      categories,
      tags,
      city,
      state,
      latitude,
      longitude,
      radius_miles,
      min_rating,
      verified_only,
      accepts_records,
      appointment_required,
      limit = 50,
      offset = 0,
      sort = { field: 'name', direction: 'asc' },
    } = options

    // If location is provided, use RPC function for distance calculation
    if (latitude !== undefined && longitude !== undefined && radius_miles !== undefined) {
      // Call the PostgreSQL function get_resources_near
      const nearbyResult = await sqlClient<{ id: string; distance: number }[]>`
        SELECT id, distance
        FROM get_resources_near(${latitude}, ${longitude}, ${radius_miles})
      `

      if (!nearbyResult || nearbyResult.length === 0) {
        return { data: [], error: null }
      }

      // Extract resource IDs and create a distance map
      const distanceMap = new Map<string, number>()
      const resourceIds = nearbyResult.map((item) => {
        distanceMap.set(item.id, item.distance)
        return item.id
      })

      // Build parameterized WHERE conditions
      const conditions = buildResourceConditions(
        {
          search,
          categories,
          city,
          state,
          min_rating,
          verified_only,
          accepts_records,
          appointment_required,
        },
        resourceIds,
        'with_primary_category'
      )
      const whereClause = combineConditions(conditions)

      const filteredResources = await sqlClient<Resource[]>`
        SELECT * FROM resources
        WHERE ${whereClause}
      `

      // Attach distance to each resource
      const resourcesWithDistance = filteredResources.map((resource) => ({
        ...resource,
        distance: distanceMap.get(resource.id) || 0,
      }))

      // Apply sorting
      if (sort.field === 'distance') {
        resourcesWithDistance.sort((a, b) => {
          const comparison = (a.distance || 0) - (b.distance || 0)
          return sort.direction === 'asc' ? comparison : -comparison
        })
      } else {
        resourcesWithDistance.sort((a, b) => {
          const aVal = a[sort.field as keyof Resource]
          const bVal = b[sort.field as keyof Resource]
          if (aVal === undefined || aVal === null || bVal === undefined || bVal === null) return 0
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
          return sort.direction === 'asc' ? comparison : -comparison
        })
      }

      // Apply pagination
      const paginatedResults = resourcesWithDistance.slice(offset || 0, (offset || 0) + limit)

      return { data: paginatedResults, error: null }
    }

    // No location provided - use standard query
    const conditions = buildResourceConditions({
      search,
      categories,
      tags,
      city,
      state,
      min_rating,
      verified_only,
      accepts_records,
      appointment_required,
    })
    const whereClause = combineConditions(conditions)

    // Validate sort field and direction against allowlists
    const sortField = (ALLOWED_SORT_FIELDS as readonly string[]).includes(sort.field)
      ? sort.field === 'distance'
        ? 'name'
        : sort.field
      : 'name'
    const sortDir = sort.direction === 'desc' ? 'DESC' : 'ASC'

    // sort field and direction are validated against allowlists above, safe for sql.unsafe
    const data = await sqlClient<Resource[]>`
      SELECT * FROM resources
      WHERE ${whereClause}
      ORDER BY ${sqlClient.unsafe(sortField)} ${sqlClient.unsafe(sortDir)}
      LIMIT ${limit}
      OFFSET ${offset || 0}
    `

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error in getResources:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Get a single resource by ID
 */
export async function getResourceById(
  id: string
): Promise<{ data: Resource | null; error: Error | null }> {
  try {
    const result = await sqlClient<Resource[]>`
      SELECT * FROM resources WHERE id = ${id} LIMIT 1
    `

    if (result.length === 0) {
      return { data: null, error: new Error('Resource not found') }
    }

    return { data: result[0], error: null }
  } catch (error) {
    console.error('Unexpected error in getResourceById:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Get resources near a location using PostGIS
 */
export async function getResourcesNear(
  latitude: number,
  longitude: number,
  radiusMiles = 10
): Promise<{ data: ResourceWithDistance[] | null; error: Error | null }> {
  try {
    const result = await sqlClient<ResourceWithDistance[]>`
      SELECT id, name, address, distance
      FROM get_resources_near(${latitude}, ${longitude}, ${radiusMiles})
    `

    return { data: result, error: null }
  } catch (error) {
    console.error('Unexpected error in getResourcesNear:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Get resources by category
 */
export async function getResourcesByCategory(
  category: ResourceCategory,
  limit = 50
): Promise<{ data: Resource[] | null; error: Error | null }> {
  return getResources({ categories: [category], limit })
}

/**
 * Search resources by query string
 */
export async function searchResources(
  query: string,
  limit = 50
): Promise<{ data: Resource[] | null; error: Error | null }> {
  return getResources({ search: query, limit })
}

/**
 * Get total count of active resources
 */
export async function getResourceCount(): Promise<{
  data: number | null
  error: Error | null
}> {
  try {
    const result = await sqlClient<{ count: string }[]>`
      SELECT COUNT(*) as count FROM resources WHERE status = 'active'
    `

    return { data: parseInt(result[0]?.count || '0', 10), error: null }
  } catch (error) {
    console.error('Unexpected error in getResourceCount:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Get count of resources matching filters
 */
export async function getResourcesCount(
  options: Omit<GetResourcesOptions, 'limit' | 'offset' | 'page'> = {}
): Promise<{
  data: number | null
  error: Error | null
}> {
  try {
    const {
      search,
      categories,
      tags,
      city,
      state,
      latitude,
      longitude,
      radius_miles,
      min_rating,
      verified_only,
      accepts_records,
      appointment_required,
    } = options

    // If location is provided, use RPC to get nearby IDs first
    if (latitude !== undefined && longitude !== undefined && radius_miles !== undefined) {
      const nearbyResult = await sqlClient<{ id: string }[]>`
        SELECT id FROM get_resources_near(${latitude}, ${longitude}, ${radius_miles})
      `

      if (!nearbyResult || nearbyResult.length === 0) {
        return { data: 0, error: null }
      }

      const resourceIds = nearbyResult.map((item) => item.id)

      const conditions = buildResourceConditions(
        {
          search,
          categories,
          city,
          state,
          min_rating,
          verified_only,
          accepts_records,
          appointment_required,
        },
        resourceIds,
        'with_primary_category'
      )
      const whereClause = combineConditions(conditions)

      const result = await sqlClient<{ count: string }[]>`
        SELECT COUNT(*) as count FROM resources
        WHERE ${whereClause}
      `

      return { data: parseInt(result[0]?.count || '0', 10), error: null }
    }

    // No location - use standard query
    const conditions = buildResourceConditions({
      search,
      categories,
      tags,
      city,
      state,
      min_rating,
      verified_only,
      accepts_records,
      appointment_required,
    })
    const whereClause = combineConditions(conditions)

    const result = await sqlClient<{ count: string }[]>`
      SELECT COUNT(*) as count FROM resources
      WHERE ${whereClause}
    `

    return { data: parseInt(result[0]?.count || '0', 10), error: null }
  } catch (error) {
    console.error('Unexpected error in getResourcesCount:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Get count of resources per category
 */
export async function getCategoryCounts(
  options: {
    search?: string
    city?: string
    state?: string
    latitude?: number
    longitude?: number
    radius_miles?: number
  } = {}
): Promise<{
  data: Partial<Record<ResourceCategory, number>> | null
  error: Error | null
}> {
  try {
    const { search, city, state, latitude, longitude, radius_miles } = options

    let resourceList: { categories: string[] | null }[] = []

    // If location filtering is provided, get nearby resources first
    if (latitude !== undefined && longitude !== undefined && radius_miles !== undefined) {
      const nearbyResult = await sqlClient<{ id: string }[]>`
        SELECT id FROM get_resources_near(${latitude}, ${longitude}, ${radius_miles})
      `

      if (!nearbyResult || nearbyResult.length === 0) {
        return { data: {}, error: null }
      }

      const resourceIds = nearbyResult.map((item) => item.id)

      const conditions = buildResourceConditions(
        { search, city, state },
        resourceIds,
        'with_primary_category'
      )
      const whereClause = combineConditions(conditions)

      resourceList = await sqlClient<{ categories: string[] | null }[]>`
        SELECT categories FROM resources
        WHERE ${whereClause}
      `
    } else {
      // No location filtering - get all active resources
      const conditions = buildResourceConditions(
        { search, city, state },
        undefined,
        'with_primary_category'
      )
      const whereClause = combineConditions(conditions)

      resourceList = await sqlClient<{ categories: string[] | null }[]>`
        SELECT categories FROM resources
        WHERE ${whereClause}
      `
    }

    // Count resources per category
    const counts: Partial<Record<ResourceCategory, number>> = {}

    resourceList.forEach((resource) => {
      if (resource.categories && Array.isArray(resource.categories)) {
        resource.categories.forEach((category) => {
          const cat = category as ResourceCategory
          counts[cat] = (counts[cat] || 0) + 1
        })
      }
    })

    return { data: counts, error: null }
  } catch (error) {
    console.error('Unexpected error in getCategoryCounts:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}
