/**
 * Favorites API - Drizzle ORM Implementation
 *
 * Functions for managing user favorites using self-hosted PostgreSQL.
 */

import { sql as sqlClient } from '@/lib/db/client'
import type { Resource } from '@/lib/types/database'

export interface UserFavoriteWithResource {
  id: string
  user_id: string
  resource_id: string
  notes: string | null
  created_at: string
  resource: Resource | null
}

/**
 * Get all favorites for the current user
 */
export async function getUserFavorites(userId: string) {
  try {
    const data = await sqlClient<UserFavoriteWithResource[]>`
      SELECT
        uf.id,
        uf.user_id,
        uf.resource_id,
        uf.notes,
        uf.created_at::text,
        row_to_json(r.*) as resource
      FROM user_favorites uf
      LEFT JOIN resources r ON uf.resource_id = r.id
      WHERE uf.user_id = ${userId}
      ORDER BY uf.created_at DESC
    `

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Check if a resource is favorited by the current user
 */
export async function isFavorited(userId: string, resourceId: string): Promise<boolean> {
  try {
    const result = await sqlClient<{ id: string }[]>`
      SELECT id FROM user_favorites
      WHERE user_id = ${userId} AND resource_id = ${resourceId}
      LIMIT 1
    `

    return result.length > 0
  } catch (error) {
    console.error('Error checking favorite status:', error)
    return false
  }
}

/**
 * Add a resource to favorites
 */
export async function addFavorite(userId: string, resourceId: string, notes?: string) {
  try {
    const data = await sqlClient<
      {
        id: string
        user_id: string
        resource_id: string
        notes: string | null
        created_at: string
      }[]
    >`
      INSERT INTO user_favorites (user_id, resource_id, notes)
      VALUES (${userId}, ${resourceId}, ${notes || null})
      RETURNING id, user_id, resource_id, notes, created_at::text
    `

    return { data: data[0] || null, error: null }
  } catch (error) {
    console.error('Error adding favorite:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Remove a resource from favorites
 */
export async function removeFavorite(userId: string, resourceId: string) {
  try {
    await sqlClient`
      DELETE FROM user_favorites
      WHERE user_id = ${userId} AND resource_id = ${resourceId}
    `

    return { error: null }
  } catch (error) {
    console.error('Error removing favorite:', error)
    return { error: error as Error }
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(userId: string, resourceId: string) {
  const isFav = await isFavorited(userId, resourceId)

  if (isFav) {
    return await removeFavorite(userId, resourceId)
  } else {
    return await addFavorite(userId, resourceId)
  }
}

/**
 * Update favorite notes
 */
export async function updateFavoriteNotes(userId: string, resourceId: string, notes: string) {
  try {
    const data = await sqlClient<
      {
        id: string
        user_id: string
        resource_id: string
        notes: string | null
        created_at: string
      }[]
    >`
      UPDATE user_favorites
      SET notes = ${notes}
      WHERE user_id = ${userId} AND resource_id = ${resourceId}
      RETURNING id, user_id, resource_id, notes, created_at::text
    `

    if (data.length === 0) {
      return { data: null, error: new Error('Favorite not found') }
    }

    return { data: data[0], error: null }
  } catch (error) {
    console.error('Error updating favorite notes:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get favorite count for a resource
 */
export async function getFavoriteCount(resourceId: string): Promise<number> {
  try {
    const result = await sqlClient<{ count: string }[]>`
      SELECT COUNT(*) as count FROM user_favorites
      WHERE resource_id = ${resourceId}
    `

    return parseInt(result[0]?.count || '0', 10)
  } catch (error) {
    console.error('Error getting favorite count:', error)
    return 0
  }
}
