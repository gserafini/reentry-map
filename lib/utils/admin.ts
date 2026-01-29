import { getSession } from 'next-auth/react'

/**
 * Admin utilities
 *
 * Functions for checking admin access and permissions
 *
 * Migration note: Switched from Supabase Auth to NextAuth.js
 */

/**
 * Check if a user is an admin by user ID
 *
 * Note: This still queries the Supabase database for admin status.
 * The isAdmin flag is also available in the NextAuth session token.
 *
 * @deprecated Use useAuth().isAdmin instead when possible
 */
export async function isAdmin(userId: string): Promise<boolean> {
  // Import dynamically to avoid client-side issues
  const { createClient } = await import('@/lib/supabase/client')
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
 *
 * Uses NextAuth session to get admin status from the JWT token.
 * No database query needed - isAdmin is populated in the JWT callback.
 *
 * @example
 * ```tsx
 * // Preferred: Use the useAuth hook
 * const { isAdmin } = useAuth()
 *
 * // Alternative: Use this function
 * const isAdmin = await checkCurrentUserIsAdmin()
 * ```
 */
export async function checkCurrentUserIsAdmin(): Promise<boolean> {
  const session = await getSession()

  if (!session?.user) return false

  // isAdmin is populated in the JWT callback from the database
  return session.user.isAdmin ?? false
}
