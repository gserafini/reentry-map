'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import { RateReview as RateReviewIcon } from '@mui/icons-material'
import { ReviewCard } from './ReviewCard'
import { getResourceReviews, getUserHelpfulnessVotes } from '@/lib/api/reviews'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Database } from '@/lib/types/database'

type ResourceReview = Database['public']['Tables']['resource_reviews']['Row'] & {
  user?: {
    id: string
    email: string | null
    phone: string | null
  }
}

type SortOption = 'recent' | 'helpful' | 'rating_high' | 'rating_low'

interface ReviewsListProps {
  resourceId: string
  onWriteReviewClick?: () => void
}

/**
 * ReviewsList component
 *
 * Displays all reviews for a resource
 * - Sortable by date, helpfulness, rating
 * - Paginat ion
 * - Empty state with call-to-action
 */
export function ReviewsList({ resourceId, onWriteReviewClick }: ReviewsListProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<ResourceReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [userVotes, setUserVotes] = useState<Map<string, { is_helpful: boolean }>>(new Map())
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch reviews
  useEffect(() => {
    async function fetchReviews() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getResourceReviews(resourceId)

      if (fetchError) {
        setError('Failed to load reviews. Please try again.')
      } else if (data) {
        setReviews(data as ResourceReview[])

        // Fetch user's votes if authenticated
        if (user && data.length > 0) {
          const reviewIds = data.map((r) => r.id)
          const { data: votes } = await getUserHelpfulnessVotes(user.id, reviewIds)

          if (votes) {
            const votesMap = new Map(
              votes.map((v) => [v.review_id, { is_helpful: v.is_helpful }])
            )
            setUserVotes(votesMap)
          }
        }
      }

      setLoading(false)
    }

    fetchReviews()
  }, [resourceId, user, refreshKey])

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'helpful':
        return (b.helpful_count || 0) - (a.helpful_count || 0)
      case 'rating_high':
        return b.rating - a.rating
      case 'rating_low':
        return a.rating - b.rating
      default:
        return 0
    }
  })

  const handleVoteChange = () => {
    // Trigger a refresh of the reviews to update helpfulness counts
    setRefreshKey((prev) => prev + 1)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    )
  }

  if (reviews.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <RateReviewIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No reviews yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Be the first to share your experience with this resource
        </Typography>
        {onWriteReviewClick && (
          <Button variant="contained" onClick={onWriteReviewClick}>
            Write a Review
          </Button>
        )}
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Reviews ({reviews.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort by</InputLabel>
            <Select value={sortBy} label="Sort by" onChange={(e) => setSortBy(e.target.value as SortOption)}>
              <MenuItem value="recent">Most Recent</MenuItem>
              <MenuItem value="helpful">Most Helpful</MenuItem>
              <MenuItem value="rating_high">Highest Rating</MenuItem>
              <MenuItem value="rating_low">Lowest Rating</MenuItem>
            </Select>
          </FormControl>
          {onWriteReviewClick && (
            <Button variant="outlined" onClick={onWriteReviewClick} size="small">
              Write Review
            </Button>
          )}
        </Box>
      </Box>

      {/* Reviews */}
      <Stack spacing={2}>
        {sortedReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            userVote={userVotes.get(review.id)}
            onVoteChange={handleVoteChange}
          />
        ))}
      </Stack>
    </Box>
  )
}
