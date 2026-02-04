'use client'

import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { identifyUser, clearUser } from '@/lib/analytics/queue'

/**
 * Unified user type for NextAuth authentication
 */
export interface AuthUser {
  id: string
  email?: string | null
  phone?: string | null
  name?: string | null
  image?: string | null
  isAdmin?: boolean
  created_at?: string | null
}

export interface UseAuthResult {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

/**
 * Custom hook for managing user authentication state using NextAuth.js
 *
 * Features:
 * - Get current authenticated user
 * - Check authentication status
 * - Check admin status
 * - Sign out functionality
 * - Automatic analytics identification
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signOut, isAdmin } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <p>Please sign in</p>
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.name || user.email || user.phone}</p>
 *       {isAdmin && <p>Admin Mode</p>}
 *       <button onClick={signOut}>Sign out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuthNextAuth(): UseAuthResult {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated' && !!session?.user

  // Convert NextAuth session user to our AuthUser type
  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        phone: session.user.phone,
        name: session.user.name,
        image: session.user.image,
        isAdmin: session.user.isAdmin,
        created_at: session.user.created_at,
      }
    : null

  const isAdmin = user?.isAdmin ?? false

  /**
   * Handle analytics identification when auth state changes
   */
  useEffect(() => {
    if (user) {
      // User signed in - identify them in analytics
      identifyUser(user.id)

      // Store admin status for analytics filtering
      if (user.isAdmin) {
        localStorage.setItem('analytics_user_role', 'admin')
        console.log('[Analytics] Admin user identified - events will be marked as admin')
      } else {
        localStorage.removeItem('analytics_user_role')
      }
    } else if (status === 'unauthenticated') {
      // User signed out - clear analytics identification
      clearUser()
      localStorage.removeItem('analytics_user_role')
    }
  }, [user, status])

  /**
   * Sign out user and redirect to homepage
   */
  const signOut = async () => {
    try {
      // Clear analytics user identification
      clearUser()
      localStorage.removeItem('analytics_user_role')

      // Sign out via NextAuth
      await nextAuthSignOut({ redirect: false })

      router.refresh() // Refresh server components
      router.push('/') // Redirect to homepage
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  /**
   * Refresh user data from server
   * In NextAuth, this triggers a session refresh
   */
  const refreshUser = async () => {
    // NextAuth's useSession automatically refreshes
    // For explicit refresh, we can update the session or just refresh the page
    router.refresh()
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    signOut,
    refreshUser,
  }
}

// Re-export as useAuth for drop-in replacement
export { useAuthNextAuth as useAuth }
