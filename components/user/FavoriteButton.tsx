'use client'

import { useState } from 'react'
import { IconButton, CircularProgress, Tooltip, Snackbar, Alert, Button } from '@mui/material'
import { Favorite as FavoriteIcon, FavoriteBorder as FavoriteBorderIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { useFavorites } from '@/lib/context/FavoritesContext'
import type { SavedResourceInput } from '@/lib/utils/saved-resources'

interface FavoriteButtonProps {
  resourceId: string
  resource?: SavedResourceInput
  size?: 'small' | 'medium' | 'large'
  /** Kept for caller compatibility; saving never requires authentication. */
  showAuthModal?: () => void
}

export function FavoriteButton({ resourceId, resource, size = 'medium' }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth()
  const { isFavorited, toggleFavorite, isLoading: checking, error } = useFavorites()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const isFav = isFavorited(resourceId)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const saved = await toggleFavorite(resourceId, resource)
      const changed = saved !== isFav
      setFailed(!changed)
      setFeedback(
        changed
          ? saved
            ? isAuthenticated
              ? 'Saved to your account.'
              : 'Saved on this device. Find it in Saved.'
            : 'Removed from your saved list.'
          : 'Your saved list could not be updated.'
      )
    } finally {
      setLoading(false)
    }
  }

  const label = isFav ? 'Remove from favorites' : 'Add to favorites'
  return (
    <>
      <Tooltip
        title={
          isFav
            ? 'Remove from saved resources'
            : isAuthenticated
              ? 'Save to your account'
              : 'Save on this device'
        }
      >
        <span>
          <IconButton
            onClick={handleClick}
            size={size}
            color={isFav ? 'error' : 'default'}
            disabled={loading || checking}
            aria-label={label}
            aria-pressed={isFav}
          >
            {loading || checking ? (
              <CircularProgress size={size === 'small' ? 16 : size === 'large' ? 28 : 20} />
            ) : isFav ? (
              <FavoriteIcon />
            ) : (
              <FavoriteBorderIcon />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Snackbar
        open={!!feedback}
        autoHideDuration={5000}
        onClose={() => setFeedback(null)}
        sx={{ bottom: { xs: 76, sm: 24 } }}
      >
        <Alert
          severity={failed ? 'error' : 'success'}
          onClose={() => setFeedback(null)}
          action={
            !failed ? (
              <Button color="inherit" href="/favorites">
                Saved
              </Button>
            ) : undefined
          }
        >
          {failed && error ? error : feedback}
        </Alert>
      </Snackbar>
    </>
  )
}
