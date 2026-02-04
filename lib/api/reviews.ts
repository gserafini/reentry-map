/**
 * Reviews API - Drizzle ORM Implementation
 *
 * Functions for managing resource reviews using self-hosted PostgreSQL.
 */

import { sql as sqlClient } from '@/lib/db/client'

export interface ResourceReview {
  id: string
  user_id: string
  resource_id: string
  rating: number
  text: string | null
  pros: string[] | null
  cons: string[] | null
  tips: string | null
  status: string
  helpful_count: number
  created_at: string
  updated_at: string
}

export interface ResourceReviewWithUser extends ResourceReview {
  user: {
    id: string
    name: string | null
    phone: string | null
    avatar_url: string | null
  } | null
}

export interface ReviewInsert {
  user_id: string
  resource_id: string
  rating: number
  text?: string | null
  pros?: string[] | null
  cons?: string[] | null
  tips?: string | null
}

export interface ReviewHelpfulness {
  id: string
  user_id: string
  review_id: string
  is_helpful: boolean
  created_at: string
}

/**
 * Get all reviews for a resource
 */
export async function getResourceReviews(resourceId: string) {
  try {
    // Direct query with join - no need to check count first
    const data = await sqlClient<ResourceReviewWithUser[]>`
      SELECT
        rr.id,
        rr.user_id,
        rr.resource_id,
        rr.rating,
        rr.text,
        rr.pros,
        rr.cons,
        rr.tips,
        rr.status,
        rr.helpful_count,
        rr.created_at::text,
        rr.updated_at::text,
        json_build_object('id', u.id, 'name', u.name, 'phone', u.phone, 'avatar_url', u.avatar_url) as user
      FROM resource_reviews rr
      LEFT JOIN users u ON rr.user_id = u.id
      WHERE rr.resource_id = ${resourceId}
      ORDER BY rr.created_at DESC
    `

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * Get user's review for a resource
 */
export async function getUserReview(userId: string, resourceId: string) {
  try {
    const result = await sqlClient<ResourceReview[]>`
      SELECT
        id, user_id, resource_id, rating, text, pros, cons, tips, status, helpful_count,
        created_at::text, updated_at::text
      FROM resource_reviews
      WHERE user_id = ${userId} AND resource_id = ${resourceId}
      LIMIT 1
    `

    return result[0] || null
  } catch (error) {
    console.error('Error fetching user review:', error)
    return null
  }
}

/**
 * Submit a new review
 */
export async function submitReview(review: ReviewInsert) {
  try {
    const data = await sqlClient<ResourceReview[]>`
      INSERT INTO resource_reviews (user_id, resource_id, rating, text, pros, cons, tips)
      VALUES (
        ${review.user_id},
        ${review.resource_id},
        ${review.rating},
        ${review.text || null},
        ${review.pros || null},
        ${review.cons || null},
        ${review.tips || null}
      )
      RETURNING id, user_id, resource_id, rating, text, pros, cons, tips, status, helpful_count, created_at::text, updated_at::text
    `

    return { data: data[0] || null, error: null }
  } catch (error) {
    console.error('Error submitting review:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update an existing review
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  updates: Partial<ReviewInsert>
) {
  try {
    // Only update fields that were explicitly provided
    const data = await sqlClient<ResourceReview[]>`
      UPDATE resource_reviews
      SET
        rating = CASE WHEN ${updates.rating !== undefined} THEN ${updates.rating ?? null} ELSE rating END,
        text = CASE WHEN ${updates.text !== undefined} THEN ${updates.text ?? null} ELSE text END,
        pros = CASE WHEN ${updates.pros !== undefined} THEN ${updates.pros ?? null} ELSE pros END,
        cons = CASE WHEN ${updates.cons !== undefined} THEN ${updates.cons ?? null} ELSE cons END,
        tips = CASE WHEN ${updates.tips !== undefined} THEN ${updates.tips ?? null} ELSE tips END,
        updated_at = NOW()
      WHERE id = ${reviewId} AND user_id = ${userId}
      RETURNING id, user_id, resource_id, rating, text, pros, cons, tips, status, helpful_count, created_at::text, updated_at::text
    `

    if (data.length === 0) {
      return { data: null, error: new Error('Review not found or not owned by user') }
    }

    return { data: data[0], error: null }
  } catch (error) {
    console.error('Error updating review:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string, userId: string) {
  try {
    await sqlClient`
      DELETE FROM resource_reviews
      WHERE id = ${reviewId} AND user_id = ${userId}
    `

    return { error: null }
  } catch (error) {
    console.error('Error deleting review:', error)
    return { error: error as Error }
  }
}

/**
 * Vote on review helpfulness
 */
export async function voteReviewHelpfulness(userId: string, reviewId: string, isHelpful: boolean) {
  try {
    const data = await sqlClient<ReviewHelpfulness[]>`
      INSERT INTO review_helpfulness (user_id, review_id, is_helpful)
      VALUES (${userId}, ${reviewId}, ${isHelpful})
      ON CONFLICT (user_id, review_id)
      DO UPDATE SET is_helpful = ${isHelpful}
      RETURNING id, user_id, review_id, is_helpful, created_at::text
    `

    return { data: data[0] || null, error: null }
  } catch (error) {
    console.error('Error voting on review helpfulness:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Remove helpfulness vote
 */
export async function removeHelpfulnessVote(userId: string, reviewId: string) {
  try {
    await sqlClient`
      DELETE FROM review_helpfulness
      WHERE user_id = ${userId} AND review_id = ${reviewId}
    `

    return { error: null }
  } catch (error) {
    console.error('Error removing helpfulness vote:', error)
    return { error: error as Error }
  }
}

/**
 * Get user's helpfulness votes for reviews
 */
export async function getUserHelpfulnessVotes(userId: string, reviewIds: string[]) {
  try {
    if (reviewIds.length === 0) {
      return { data: [], error: null }
    }

    const data = await sqlClient<ReviewHelpfulness[]>`
      SELECT id, user_id, review_id, is_helpful, created_at::text
      FROM review_helpfulness
      WHERE user_id = ${userId}
        AND review_id = ANY(${reviewIds}::uuid[])
    `

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching helpfulness votes:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get review statistics
 */
export async function getReviewStats(resourceId: string) {
  try {
    const data = await sqlClient<
      { rating_average: number; rating_count: number; review_count: number }[]
    >`
      SELECT rating_average, rating_count, review_count
      FROM resources
      WHERE id = ${resourceId}
      LIMIT 1
    `

    if (data.length === 0) {
      return { data: null, error: new Error('Resource not found') }
    }

    return { data: data[0], error: null }
  } catch (error) {
    console.error('Error fetching review stats:', error)
    return { data: null, error: error as Error }
  }
}
