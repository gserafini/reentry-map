import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type ResourceSuggestionInsert = Database['public']['Tables']['resource_suggestions']['Insert']

/**
 * Suggestions API
 *
 * Functions for managing resource suggestions
 */

/**
 * Submit a new resource suggestion
 */
export async function submitSuggestion(suggestion: ResourceSuggestionInsert) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_suggestions')
    .insert(suggestion)
    .select()
    .single()

  if (error) {
    console.error('Error submitting suggestion:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get all suggestions for the current user
 */
export async function getUserSuggestions(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_suggestions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user suggestions:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get all pending suggestions (admin only)
 */
export async function getPendingSuggestions() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending suggestions:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Update suggestion status (admin only)
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  status: 'pending' | 'approved' | 'rejected' | 'duplicate',
  adminNotes?: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_suggestions')
    .update({
      status,
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating suggestion status:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get suggestion by ID
 */
export async function getSuggestion(suggestionId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single()

  if (error) {
    console.error('Error fetching suggestion:', error)
    return { data: null, error }
  }

  return { data, error: null }
}
