'use client'

import { useState, useEffect } from 'react'
import { Box, Rating, Typography, CircularProgress, Tooltip } from '@mui/material'
import { Star as StarIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { submitRating, getUserRating } from '@/lib/api/ratings'
import { useRouter } from 'next/navigation'

interface RatingStarsProps {
  resourceId: string
  resourceName: string
  /**
   * If true, shows as display-only (no interaction)
   */
  readOnly?: boolean
  /**
   * Size of the stars
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Callback function when auth modal should be shown
   */
  showAuthModal?: () => void
  /**
   * Callback when rating is successfully submitted
   */
  onRatingChange?: (rating: number) => void
}

/**
 * RatingStars component
 *
 * Interactive star rating component
 * - Requires authentication to rate
 * - Shows auth modal if not logged in
 * - Displays user's existing rating
 * - Updates rating on change
 * - Accessible with ARIA labels
 */
export function RatingStars({
  resourceId,
  resourceName,
  readOnly = false,
  size = 'medium',
  showAuthModal,
  onRatingChange,
}: RatingStarsProps) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [rating, setRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Load user's existing rating
  useEffect(() => {
    async function loadRating() {
      if (user && resourceId && !readOnly) {
        setChecking(true)
        const userRating = await getUserRating(user.id, resourceId)
        setRating(userRating)
        setChecking(false)
      } else {
        setChecking(false)
      }
    }
    loadRating()
  }, [user, resourceId, readOnly])

  const handleRatingChange = async (_event: React.SyntheticEvent, newValue: number | null) => {
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

    if (!user || newValue === null || readOnly) return

    setLoading(true)

    try {
      const { error } = await submitRating(user.id, resourceId, newValue)

      if (error) {
        console.error('Failed to submit rating:', error)
        // Keep the old rating on error
      } else {
        setRating(newValue)
        onRatingChange?.(newValue)
      }
    } catch (error) {
      console.error('Failed to submit rating:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayRating = hoverRating ?? rating

  // Show loading spinner while checking initial state
  if (checking && !readOnly) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={size === 'small' ? 16 : size === 'large' ? 28 : 20} />
        <Typography variant="caption" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    )
  }

  const tooltipTitle = !isAuthenticated
    ? `Sign in to rate ${resourceName}`
    : rating
      ? `You rated this ${rating} star${rating !== 1 ? 's' : ''}`
      : `Rate ${resourceName}`

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={readOnly ? '' : tooltipTitle}>
          <Box>
            <Rating
              value={displayRating}
              onChange={handleRatingChange}
              onChangeActive={(_event, newHover) => {
                if (!readOnly) {
                  setHoverRating(newHover)
                }
              }}
              disabled={loading || readOnly}
              size={size}
              emptyIcon={<StarIcon style={{ opacity: 0.3 }} fontSize="inherit" />}
              aria-label={`Rate ${resourceName}`}
              sx={{
                '& .MuiRating-iconFilled': {
                  color: 'warning.main',
                },
                '& .MuiRating-iconHover': {
                  color: 'warning.dark',
                },
                ...(readOnly
                  ? {}
                  : {
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.8,
                      },
                    }),
              }}
            />
          </Box>
        </Tooltip>
        {loading && <CircularProgress size={size === 'small' ? 12 : size === 'large' ? 20 : 16} />}
      </Box>
      {!readOnly && displayRating !== null && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {hoverRating
            ? `Click to rate ${hoverRating} star${hoverRating !== 1 ? 's' : ''}`
            : `Your rating: ${rating} star${rating !== 1 ? 's' : ''}`}
        </Typography>
      )}
    </Box>
  )
}
