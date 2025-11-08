import { createClient } from '@/lib/supabase/client'

/**
 * Admin utilities
 *
 * Functions for checking admin access and permissions
 */

/**
 * Check if a user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.from('users').select('is_admin').eq('id', userId).single()

  if (error) {
    console.error('Error checking admin status:', error)
    return false
  }

  return data?.is_admin || false
}

/**
 * Check if current user is admin (for use in components)
 */
export async function checkCurrentUserIsAdmin(): Promise<boolean> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  return isAdmin(user.id)
}
