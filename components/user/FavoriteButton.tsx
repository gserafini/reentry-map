'use client'

import { useState } from 'react'
import { IconButton, CircularProgress, Tooltip } from '@mui/material'
import { Favorite as FavoriteIcon, FavoriteBorder as FavoriteBorderIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { useFavorites } from '@/lib/context/FavoritesContext'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  resourceId: string
  size?: 'small' | 'medium' | 'large'
  showAuthModal?: () => void
}

/**
 * FavoriteButton component
 *
 * Heart icon button to favorite/unfavorite a resource.
 * Uses FavoritesContext for batch-loaded favorite state (single API call)
 * instead of per-card API calls.
 */
export function FavoriteButton({
  resourceId,
  size = 'medium',
  showAuthModal,
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth()
  const { isFavorited, toggleFavorite, isLoading: checking } = useFavorites()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isFav = isFavorited(resourceId)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // If not authenticated, show auth modal or redirect
    if (!isAuthenticated) {
      if (showAuthModal) {
        showAuthModal()
      } else {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
        router.push('/auth/login')
      }
      return
    }

    if (loading) return

    setLoading(true)
    try {
      await toggleFavorite(resourceId)
    } finally {
      setLoading(false)
    }
  }

  // Show loading spinner while initial favorites are loading
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
