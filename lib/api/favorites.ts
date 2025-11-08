import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type UserFavoriteInsert = Database['public']['Tables']['user_favorites']['Insert']

/**
 * Favorites API
 *
 * Functions for managing user favorites
 */

/**
 * Get all favorites for the current user
 */
export async function getUserFavorites(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_favorites')
    .select(
      `
      *,
      resource:resources(*)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching favorites:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Check if a resource is favorited by the current user
 */
export async function isFavorited(userId: string, resourceId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is fine
    console.error('Error checking favorite status:', error)
  }

  return !!data
}

/**
 * Add a resource to favorites
 */
export async function addFavorite(userId: string, resourceId: string, notes?: string) {
  const supabase = createClient()

  const favorite: UserFavoriteInsert = {
    user_id: userId,
    resource_id: resourceId,
    notes: notes || null,
  }

  const { data, error } = await supabase.from('user_favorites').insert(favorite).select().single()

  if (error) {
    console.error('Error adding favorite:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Remove a resource from favorites
 */
export async function removeFavorite(userId: string, resourceId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('resource_id', resourceId)

  if (error) {
    console.error('Error removing favorite:', error)
    return { error }
  }

  return { error: null }
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
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_favorites')
    .update({ notes })
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .select()
    .single()

  if (error) {
    console.error('Error updating favorite notes:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get favorite count for a resource
 */
export async function getFavoriteCount(resourceId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('user_favorites')
    .select('*', { count: 'exact', head: true })
    .eq('resource_id', resourceId)

  if (error) {
    console.error('Error getting favorite count:', error)
    return 0
  }

  return count || 0
}
