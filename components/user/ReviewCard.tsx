'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Rating,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import {
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  ThumbDown as ThumbDownIcon,
  ThumbDownOutlined as ThumbDownOutlinedIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { voteReviewHelpfulness, removeHelpfulnessVote } from '@/lib/api/reviews'
import { getUserDisplayName } from '@/lib/utils/avatar'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/types/database'

type ResourceReview = Database['public']['Tables']['resource_reviews']['Row'] & {
  user?: {
    id: string
    email: string | null
    phone: string | null
  }
}

interface ReviewCardProps {
  review: ResourceReview
  userVote?: { is_helpful: boolean } | null
  onVoteChange?: () => void
}

/**
 * ReviewCard component
 *
 * Displays a single review with helpfulness voting
 * - Shows reviewer name, rating, date, review text
 * - Displays pros, cons, tips if provided
 * - Helpfulness voting (requires auth)
 */
export function ReviewCard({ review, userVote, onVoteChange }: ReviewCardProps) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [voting, setVoting] = useState(false)
  const [currentVote, setCurrentVote] = useState(userVote)

  const handleVote = async (isHelpful: boolean) => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (!user) return

    setVoting(true)

    try {
      // If clicking the same vote, remove it
      if (currentVote?.is_helpful === isHelpful) {
        const { error } = await removeHelpfulnessVote(user.id, review.id)
        if (!error) {
          setCurrentVote(null)
          onVoteChange?.()
        }
      } else {
        // Submit new vote
        const { error } = await voteReviewHelpfulness(user.id, review.id, isHelpful)
        if (!error) {
          setCurrentVote({ is_helpful: isHelpful })
          onVoteChange?.()
        }
      }
    } catch (error) {
      console.error('Failed to vote:', error)
    } finally {
      setVoting(false)
    }
  }

  const reviewerName = review.user
    ? getUserDisplayName(review.user.email, review.user.phone)
    : 'Anonymous'

  const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const isOwnReview = user?.id === review.user_id

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {reviewerName}
              {isOwnReview && (
                <Chip label="Your Review" size="small" color="primary" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {reviewDate}
              {review.visited_date && ` • Visited: ${new Date(review.visited_date).toLocaleDateString()}`}
            </Typography>
          </Box>
          <Rating value={review.rating} readOnly size="small" />
        </Box>

        {/* Review Text */}
        <Typography variant="body1" sx={{ mb: 2 }}>
          {review.review_text}
        </Typography>

        {/* Pros */}
        {review.pros && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="success.main" gutterBottom>
              ✓ Pros:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {review.pros}
            </Typography>
          </Box>
        )}

        {/* Cons */}
        {review.cons && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="error.main" gutterBottom>
              ✗ Cons:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {review.cons}
            </Typography>
          </Box>
        )}

        {/* Tips */}
        {review.tips && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>
              💡 Tips:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {review.tips}
            </Typography>
          </Box>
        )}

        {/* Badges */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {review.was_helpful && <Chip label="Found it helpful" size="small" color="success" variant="outlined" />}
          {review.would_recommend && <Chip label="Would recommend" size="small" color="primary" variant="outlined" />}
        </Box>

        {/* Helpfulness Voting */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Was this review helpful?
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={isAuthenticated ? 'Helpful' : 'Sign in to vote'}>
              <IconButton
                size="small"
                onClick={() => handleVote(true)}
                disabled={voting || isOwnReview}
                color={currentVote?.is_helpful === true ? 'primary' : 'default'}
              >
                {voting && currentVote?.is_helpful === true ? (
                  <CircularProgress size={20} />
                ) : currentVote?.is_helpful === true ? (
                  <ThumbUpIcon fontSize="small" />
                ) : (
                  <ThumbUpOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Typography variant="body2" color="text.secondary">
              {review.helpful_count || 0}
            </Typography>
            <Tooltip title={isAuthenticated ? 'Not helpful' : 'Sign in to vote'}>
              <IconButton
                size="small"
                onClick={() => handleVote(false)}
                disabled={voting || isOwnReview}
                color={currentVote?.is_helpful === false ? 'error' : 'default'}
              >
                {voting && currentVote?.is_helpful === false ? (
                  <CircularProgress size={20} />
                ) : currentVote?.is_helpful === false ? (
                  <ThumbDownIcon fontSize="small" />
                ) : (
                  <ThumbDownOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Typography variant="body2" color="text.secondary">
              {review.not_helpful_count || 0}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
