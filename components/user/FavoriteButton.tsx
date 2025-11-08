'use client'

import { useState, useEffect } from 'react'
import { IconButton, CircularProgress, Tooltip } from '@mui/material'
import { Favorite as FavoriteIcon, FavoriteBorder as FavoriteBorderIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { toggleFavorite, isFavorited } from '@/lib/api/favorites'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  resourceId: string
  size?: 'small' | 'medium' | 'large'
  showAuthModal?: () => void
}

/**
 * FavoriteButton component
 *
 * Heart icon button to favorite/unfavorite a resource
 * - Requires authentication
 * - Shows auth modal if not logged in
 * - Optimistic updates for better UX
 * - Accessible with ARIA labels
 */
export function FavoriteButton({
  resourceId,
  size = 'medium',
  showAuthModal,
}: FavoriteButtonProps) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if resource is favorited on mount
  useEffect(() => {
    async function checkFavorite() {
      if (user && resourceId) {
        setChecking(true)
        const favorited = await isFavorited(user.id, resourceId)
        setIsFav(favorited)
        setChecking(false)
      } else {
        setChecking(false)
      }
    }
    checkFavorite()
  }, [user, resourceId])

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // If not authenticated, show auth modal or redirect
    if (!isAuthenticated) {
      if (showAuthModal) {
        showAuthModal()
      } else {
        // Store the current URL to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
        router.push('/auth/login')
      }
      return
    }

    if (!user || loading) return

    setLoading(true)

    // Optimistic update
    const previousState = isFav
    setIsFav(!isFav)

    try {
      const { error } = await toggleFavorite(user.id, resourceId)

      if (error) {
        // Revert on error
        setIsFav(previousState)
        console.error('Failed to toggle favorite:', error)
      }
    } catch (error) {
      // Revert on error
      setIsFav(previousState)
      console.error('Failed to toggle favorite:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading spinner while checking initial state
  if (checking) {
    return (
      <IconButton size={size} disabled>
        <CircularProgress size={size === 'small' ? 16 : size === 'large' ? 28 : 20} />
      </IconButton>
    )
  }

  const tooltipTitle = !isAuthenticated
    ? 'Sign in to save favorites'
    : isFav
      ? 'Remove from favorites'
      : 'Add to favorites'

  return (
    <Tooltip title={tooltipTitle}>
      <IconButton
        onClick={handleClick}
        size={size}
        color={isFav ? 'error' : 'default'}
        disabled={loading}
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        sx={{
          '&:hover': {
            backgroundColor: isFav ? 'error.light' : 'action.hover',
          },
        }}
      >
        {loading ? (
          <CircularProgress size={size === 'small' ? 16 : size === 'large' ? 28 : 20} />
        ) : isFav ? (
          <FavoriteIcon />
        ) : (
          <FavoriteBorderIcon />
        )}
      </IconButton>
    </Tooltip>
  )
}
