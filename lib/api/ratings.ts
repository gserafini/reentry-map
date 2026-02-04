/**
 * Ratings API - Drizzle ORM Implementation
 *
 * Functions for managing resource ratings (1-5 stars) using self-hosted PostgreSQL.
 */

import { sql as sqlClient } from '@/lib/db/client'

export interface ResourceRating {
  id: string
  user_id: string
  resource_id: string
  rating: number
  created_at: string
  updated_at: string
}

export interface ResourceRatingWithUser extends ResourceRating {
  user: {
    id: string
    email: string | null
    phone: string | null
  } | null
}

/**
 * Get user's rating for a resource
 */
export async function getUserRating(userId: string, resourceId: string): Promise<number | null> {
  try {
    const result = await sqlClient<{ rating: number }[]>`
      SELECT rating FROM resource_ratings
      WHERE user_id = ${userId} AND resource_id = ${resourceId}
      LIMIT 1
    `

    return result[0]?.rating ?? null
  } catch (error) {
    console.error('Error fetching user rating:', error)
    return null
  }
}

/**
 * Submit or update a rating
 */
export async function submitRating(userId: string, resourceId: string, rating: number) {
  // Validate rating is between 1 and 5
  if (rating < 1 || rating > 5) {
    return { data: null, error: new Error('Rating must be between 1 and 5') }
  }

  try {
    const data = await sqlClient<ResourceRating[]>`
      INSERT INTO resource_ratings (user_id, resource_id, rating)
      VALUES (${userId}, ${resourceId}, ${rating})
      ON CONFLICT (user_id, resource_id)
      DO UPDATE SET rating = ${rating}, updated_at = NOW()
      RETURNING id, user_id, resource_id, rating, created_at::text, updated_at::text
    `

    return { data: data[0] || null, error: null }
  } catch (error) {
    console.error('Error submitting rating:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a rating
 */
export async function deleteRating(userId: string, resourceId: string) {
  try {
    await sqlClient`
      DELETE FROM resource_ratings
      WHERE user_id = ${userId} AND resource_id = ${resourceId}
    `

    return { error: null }
  } catch (error) {
    console.error('Error deleting rating:', error)
    return { error: error as Error }
  }
}

/**
 * Get rating statistics for a resource
 */
export async function getRatingStats(resourceId: string) {
  try {
    const data = await sqlClient<{ rating_average: number; rating_count: number }[]>`
      SELECT rating_average, rating_count
      FROM resources
      WHERE id = ${resourceId}
      LIMIT 1
    `

    if (data.length === 0) {
      return { data: null, error: new Error('Resource not found') }
    }

    return { data: data[0], error: null }
  } catch (error) {
    console.error('Error fetching rating stats:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all ratings for a resource with user information
 */
export async function getResourceRatings(resourceId: string) {
  try {
    const data = await sqlClient<ResourceRatingWithUser[]>`
      SELECT
        rr.id,
        rr.user_id,
        rr.resource_id,
        rr.rating,
        rr.created_at::text,
        rr.updated_at::text,
        json_build_object('id', u.id, 'email', u.email, 'phone', u.phone) as user
      FROM resource_ratings rr
      LEFT JOIN users u ON rr.user_id = u.id
      WHERE rr.resource_id = ${resourceId}
      ORDER BY rr.created_at DESC
    `

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching resource ratings:', error)
    return { data: null, error: error as Error }
  }
}
