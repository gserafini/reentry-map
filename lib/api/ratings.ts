import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type ResourceRatingInsert = Database['public']['Tables']['resource_ratings']['Insert']

/**
 * Ratings API
 *
 * Functions for managing resource ratings (1-5 stars)
 */

/**
 * Get user's rating for a resource
 */
export async function getUserRating(userId: string, resourceId: string): Promise<number | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_ratings')
    .select('rating')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is fine
    console.error('Error fetching user rating:', error)
  }

  return data?.rating ?? null
}

/**
 * Submit or update a rating
 */
export async function submitRating(userId: string, resourceId: string, rating: number) {
  const supabase = createClient()

  // Validate rating is between 1 and 5
  if (rating < 1 || rating > 5) {
    return { data: null, error: new Error('Rating must be between 1 and 5') }
  }

  const ratingData: ResourceRatingInsert = {
    user_id: userId,
    resource_id: resourceId,
    rating,
  }

  const { data, error } = await supabase
    .from('resource_ratings')
    .upsert(ratingData, {
      onConflict: 'user_id,resource_id',
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting rating:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Delete a rating
 */
export async function deleteRating(userId: string, resourceId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('resource_ratings')
    .delete()
    .eq('user_id', userId)
    .eq('resource_id', resourceId)

  if (error) {
    console.error('Error deleting rating:', error)
    return { error }
  }

  return { error: null }
}

/**
 * Get rating statistics for a resource
 */
export async function getRatingStats(resourceId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resources')
    .select('rating_average, rating_count')
    .eq('id', resourceId)
    .single()

  if (error) {
    console.error('Error fetching rating stats:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get all ratings for a resource with user information
 */
export async function getResourceRatings(resourceId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_ratings')
    .select(
      `
      *,
      user:users(id, email, phone)
    `
    )
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching resource ratings:', error)
    return { data: null, error }
  }

  return { data, error: null }
}
