import { getSession } from 'next-auth/react'

/**
 * Admin utilities (client-safe)
 *
 * Functions for checking admin access in client components.
 * Uses NextAuth.js session only - no database imports.
 *
 * For server-side admin auth, use lib/utils/admin-auth.ts
 */

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
