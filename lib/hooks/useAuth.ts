'use client'

import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export interface UseAuthResult {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

/**
 * Custom hook for managing user authentication state
 *
 * Features:
 * - Get current authenticated user
 * - Check authentication status
 * - Sign out functionality
 * - Listen to auth state changes
 * - Refresh user data
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signOut } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <p>Please sign in</p>
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.phone}</p>
 *       <button onClick={signOut}>Sign out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  /**
   * Get current user on mount
   */
  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()
  }, [supabase.auth])

  /**
   * Listen to auth state changes
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  /**
   * Sign out user and redirect to homepage
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      router.refresh() // Refresh server components
      router.push('/') // Redirect to homepage
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  /**
   * Refresh user data from server
   */
  const refreshUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshUser,
  }
}
