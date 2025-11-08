import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type ResourceUpdateInsert = Database['public']['Tables']['resource_updates']['Insert']

/**
 * Resource Updates API
 *
 * Functions for reporting issues and corrections with resources
 */

/**
 * Submit a resource update/correction
 */
export async function submitUpdate(update: ResourceUpdateInsert) {
  const supabase = createClient()

  const { data, error } = await supabase.from('resource_updates').insert(update).select().single()

  if (error) {
    console.error('Error submitting update:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get all updates for a resource
 */
export async function getResourceUpdates(resourceId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_updates')
    .select('*')
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching resource updates:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get all updates submitted by a user
 */
export async function getUserUpdates(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_updates')
    .select(
      `
      *,
      resource:resources(name)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user updates:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get all pending updates (admin only)
 */
export async function getPendingUpdates() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_updates')
    .select(
      `
      *,
      resource:resources(name),
      user:users(email, phone)
    `
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending updates:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Update status of a resource update (admin only)
 */
export async function updateUpdateStatus(
  updateId: string,
  status: 'pending' | 'applied' | 'rejected',
  adminNotes?: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_updates')
    .update({
      status,
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', updateId)
    .select()
    .single()

  if (error) {
    console.error('Error updating update status:', error)
    return { data: null, error }
  }

  return { data, error: null }
}
