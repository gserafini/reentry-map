import { createClient } from '@/lib/supabase/server'
import type {
  Resource,
  ResourceFilters,
  ResourceWithDistance,
  PaginationParams,
  ResourceSort,
  ResourceCategory,
} from '@/lib/types/database'

/**
 * Resource API - Server-side data fetching functions
 * These functions use the server Supabase client for optimal performance
 */

export interface GetResourcesOptions extends Partial<ResourceFilters>, PaginationParams {
  sort?: ResourceSort
}

/**
 * Get all resources with filtering, pagination, and sorting
 * @param options - Filtering and pagination options
 * @returns Array of resources
 */
export async function getResources(
  options: GetResourcesOptions = {}
): Promise<{ data: Resource[] | null; error: Error | null }> {
  try {
    const supabase = await createClient()
    const {
      search,
      categories,
      tags,
      min_rating,
      verified_only,
      accepts_records,
      appointment_required,
      limit = 50,
      offset = 0,
      sort = { field: 'name', direction: 'asc' },
    } = options

    let query = supabase.from('resources').select('*')

    // Always filter to active resources by default
    query = query.eq('status', 'active')

    // Apply category filter if provided (matches any category in array)
    if (categories && categories.length > 0) {
      query = query.contains('categories', categories)
    }

    // Apply tags filter if provided (matches any tag in array)
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags)
    }

    // Apply search filter if provided (searches name and description)
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply minimum rating filter
    if (min_rating !== undefined) {
      query = query.gte('rating_average', min_rating)
    }

    // Apply verified filter
    if (verified_only) {
      query = query.eq('verified', true)
    }

    // Apply accepts_records filter
    if (accepts_records !== undefined) {
      query = query.eq('accepts_records', accepts_records)
    }

    // Apply appointment_required filter
    if (appointment_required !== undefined) {
      query = query.eq('appointment_required', appointment_required)
    }

    // Apply sorting
    // Note: distance sorting requires user coordinates and is handled client-side for now
    // TODO: Implement server-side distance sorting with PostGIS or URL params
    const sortField = sort.field === 'distance' ? 'name' : sort.field
    query = query.order(sortField, { ascending: sort.direction === 'asc' })

    // Apply pagination
    if (limit) {
      query = query.range(offset || 0, (offset || 0) + limit - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching resources:', error)
      return { data: null, error: new Error('Failed to fetch resources') }
    }

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
 * @param id - Resource ID
 * @returns Single resource or null
 */
export async function getResourceById(
  id: string
): Promise<{ data: Resource | null; error: Error | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from('resources').select('*').eq('id', id).single()

    if (error) {
      console.error(`Error fetching resource ${id}:`, error)
      return { data: null, error: new Error('Resource not found') }
    }

    return { data, error: null }
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
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @param radiusMiles - Search radius in miles (default: 10)
 * @returns Array of resources with distance
 */
export async function getResourcesNear(
  latitude: number,
  longitude: number,
  radiusMiles = 10
): Promise<{ data: ResourceWithDistance[] | null; error: Error | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_resources_near', {
      user_lat: latitude,
      user_lng: longitude,
      radius_miles: radiusMiles,
    })

    if (error) {
      console.error('Error fetching nearby resources:', error)
      return { data: null, error: new Error('Failed to fetch nearby resources') }
    }

    return { data, error: null }
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
 * @param category - Category to filter by
 * @param limit - Maximum number of results
 * @returns Array of resources in the specified category
 */
export async function getResourcesByCategory(
  category: ResourceCategory,
  limit = 50
): Promise<{ data: Resource[] | null; error: Error | null }> {
  return getResources({ categories: [category], limit })
}

/**
 * Search resources by query string
 * @param query - Search string to match against name and description
 * @param limit - Maximum number of results
 * @returns Array of matching resources
 */
export async function searchResources(
  query: string,
  limit = 50
): Promise<{ data: Resource[] | null; error: Error | null }> {
  return getResources({ search: query, limit })
}

/**
 * Get total count of active resources
 * @returns Total count of active resources
 */
export async function getResourceCount(): Promise<{
  data: number | null
  error: Error | null
}> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (error) {
      console.error('Error counting resources:', error)
      return { data: null, error: new Error('Failed to count resources') }
    }

    return { data: count, error: null }
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
 * @param options - Filter options (same as getResources but without pagination)
 * @returns Total count of matching resources
 */
export async function getResourcesCount(
  options: Omit<GetResourcesOptions, 'limit' | 'offset' | 'page'> = {}
): Promise<{
  data: number | null
  error: Error | null
}> {
  try {
    const supabase = await createClient()
    const {
      search,
      categories,
      tags,
      min_rating,
      verified_only,
      accepts_records,
      appointment_required,
    } = options

    let query = supabase.from('resources').select('*', { count: 'exact', head: true })

    // Always filter to active resources by default
    query = query.eq('status', 'active')

    // Apply category filter if provided (matches any category in array)
    if (categories && categories.length > 0) {
      query = query.contains('categories', categories)
    }

    // Apply tags filter if provided (matches any tag in array)
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags)
    }

    // Apply search filter if provided (searches name and description)
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply minimum rating filter
    if (min_rating !== undefined) {
      query = query.gte('rating_average', min_rating)
    }

    // Apply verified filter
    if (verified_only) {
      query = query.eq('verified', true)
    }

    // Apply accepts_records filter
    if (accepts_records !== undefined) {
      query = query.eq('accepts_records', accepts_records)
    }

    // Apply appointment_required filter
    if (appointment_required !== undefined) {
      query = query.eq('appointment_required', appointment_required)
    }

    const { count, error } = await query

    if (error) {
      console.error('Error counting resources:', error)
      return { data: null, error: new Error('Failed to count resources') }
    }

    return { data: count, error: null }
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
 * @returns Map of category to resource count
 */
export async function getCategoryCounts(): Promise<{
  data: Partial<Record<ResourceCategory, number>> | null
  error: Error | null
}> {
  try {
    const supabase = await createClient()

    // Get all active resources with their categories
    const { data: resources, error } = await supabase
      .from('resources')
      .select('categories')
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching resources for category counts:', error)
      return { data: null, error: new Error('Failed to fetch category counts') }
    }

    // Count resources per category
    const counts: Partial<Record<ResourceCategory, number>> = {}

    resources?.forEach((resource) => {
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
