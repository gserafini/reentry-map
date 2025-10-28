'use client'

import { useState, useEffect } from 'react'
import { checkGravatarExists, getGravatarUrl } from '@/lib/utils/avatar'

export interface UseGravatarResult {
  /**
   * Gravatar URL if available, null otherwise
   */
  gravatarUrl: string | null

  /**
   * Whether Gravatar check is in progress
   */
  isLoading: boolean

  /**
   * Whether a Gravatar exists for the email
   */
  hasGravatar: boolean
}

/**
 * Custom hook to check and retrieve Gravatar avatar
 * Checks if user has a Gravatar and returns the URL if available
 * Caches result in component state to avoid repeated checks
 *
 * @param email - User's email address (null/undefined for no check)
 * @param size - Avatar size in pixels (default: 200)
 * @returns Gravatar URL, loading state, and availability
 *
 * @example
 * ```tsx
 * function Avatar({ email }) {
 *   const { gravatarUrl, isLoading, hasGravatar } = useGravatar(email)
 *
 *   if (isLoading) return <Skeleton variant="circular" />
 *   if (hasGravatar && gravatarUrl) {
 *     return <img src={gravatarUrl} alt="Avatar" />
 *   }
 *   return <InitialsAvatar email={email} />
 * }
 * ```
 */
export function useGravatar(email?: string | null, size: number = 200): UseGravatarResult {
  const [hasGravatar, setHasGravatar] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(null)

  useEffect(() => {
    // Skip if no email provided
    if (!email) {
      setHasGravatar(false)
      setGravatarUrl(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    const checkGravatar = async () => {
      try {
        const exists = await checkGravatarExists(email)

        // Don't update state if component unmounted
        if (cancelled) return

        setHasGravatar(exists)

        if (exists) {
          const url = getGravatarUrl(email, size)
          setGravatarUrl(url)
        } else {
          setGravatarUrl(null)
        }
      } catch (error) {
        console.debug('Error checking Gravatar:', error)
        if (!cancelled) {
          setHasGravatar(false)
          setGravatarUrl(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    checkGravatar()

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true
    }
  }, [email, size])

  return {
    gravatarUrl,
    isLoading,
    hasGravatar,
  }
}
