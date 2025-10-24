import { createClient } from '@/lib/supabase/server'
import type { Resource } from '@/lib/types/database'

/**
 * Resource API - Server-side data fetching functions
 * These functions use the server Supabase client for optimal performance
 */

export interface ResourceFilters {
  category?: string
  search?: string
  status?: 'active' | 'inactive' | 'draft' | 'flagged'
}

export interface GetResourcesOptions extends ResourceFilters {
  limit?: number
  offset?: number
}

/**
 * Get all active resources
 * @param options - Filtering and pagination options
 * @returns Array of resources
 */
export async function getResources(
  options: GetResourcesOptions = {}
): Promise<{ data: Resource[] | null; error: Error | null }> {
  try {
    const supabase = await createClient()
    const { category, search, status = 'active', limit = 50, offset = 0 } = options

    let query = supabase
      .from('resources')
      .select('*')
      .eq('status', status)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply category filter if provided
    if (category) {
      query = query.eq('primary_category', category)
    }

    // Apply search filter if provided (searches name and description)
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
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
 * Get resources by category
 * @param category - Primary category to filter by
 * @param limit - Maximum number of results
 * @returns Array of resources in the specified category
 */
export async function getResourcesByCategory(
  category: string,
  limit = 50
): Promise<{ data: Resource[] | null; error: Error | null }> {
  return getResources({ category, limit })
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
