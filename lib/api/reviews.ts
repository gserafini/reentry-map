import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type ResourceReviewInsert = Database['public']['Tables']['resource_reviews']['Insert']

/**
 * Reviews API
 *
 * Functions for managing resource reviews
 */

/**
 * Get all reviews for a resource
 */
export async function getResourceReviews(resourceId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_reviews')
    .select(
      `
      *,
      user:users!user_id(id, name, phone, avatar_url)
    `
    )
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reviews:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get user's review for a resource
 */
export async function getUserReview(userId: string, resourceId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is fine
    console.error('Error fetching user review:', error)
  }

  return data
}

/**
 * Submit a new review
 */
export async function submitReview(review: ResourceReviewInsert) {
  const supabase = createClient()

  const { data, error } = await supabase.from('resource_reviews').insert(review).select().single()

  if (error) {
    console.error('Error submitting review:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Update an existing review
 */
export async function updateReview(reviewId: string, updates: Partial<ResourceReviewInsert>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_reviews')
    .update(updates)
    .eq('id', reviewId)
    .select()
    .single()

  if (error) {
    console.error('Error updating review:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string, userId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('resource_reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId) // Ensure user can only delete their own review

  if (error) {
    console.error('Error deleting review:', error)
    return { error }
  }

  return { error: null }
}

/**
 * Vote on review helpfulness
 */
export async function voteReviewHelpfulness(userId: string, reviewId: string, isHelpful: boolean) {
  const supabase = createClient()

  const vote = {
    user_id: userId,
    review_id: reviewId,
    is_helpful: isHelpful,
  }

  const { data, error } = await supabase
    .from('review_helpfulness')
    .upsert(vote, {
      onConflict: 'user_id,review_id',
    })
    .select()
    .single()

  if (error) {
    console.error('Error voting on review helpfulness:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Remove helpfulness vote
 */
export async function removeHelpfulnessVote(userId: string, reviewId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('review_helpfulness')
    .delete()
    .eq('user_id', userId)
    .eq('review_id', reviewId)

  if (error) {
    console.error('Error removing helpfulness vote:', error)
    return { error }
  }

  return { error: null }
}

/**
 * Get user's helpfulness votes for reviews
 */
export async function getUserHelpfulnessVotes(userId: string, reviewIds: string[]) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('review_helpfulness')
    .select('*')
    .eq('user_id', userId)
    .in('review_id', reviewIds)

  if (error) {
    console.error('Error fetching helpfulness votes:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get review statistics
 */
export async function getReviewStats(resourceId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resources')
    .select('rating_average, rating_count, review_count')
    .eq('id', resourceId)
    .single()

  if (error) {
    console.error('Error fetching review stats:', error)
    return { data: null, error }
  }

  return { data, error: null }
}
