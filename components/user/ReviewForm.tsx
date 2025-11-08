'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Card,
  CardContent,
  Rating,
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material'
import { useAuth } from '@/lib/hooks/useAuth'
import { submitReview, updateReview, getUserReview } from '@/lib/api/reviews'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/types/database'

type ResourceReviewInsert = Database['public']['Tables']['resource_reviews']['Insert']

interface ReviewFormProps {
  resourceId: string
  resourceName: string
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * ReviewForm component
 *
 * Form for submitting and editing resource reviews
 * - Requires authentication
 * - Supports creating new reviews and editing existing ones
 * - Includes rating, text, pros/cons, tips
 * - Form validation
 */
export function ReviewForm({ resourceId, resourceName, onSuccess, onCancel }: ReviewFormProps) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  // Form state
  const [rating, setRating] = useState<number | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [pros, setPros] = useState('')
  const [cons, setCons] = useState('')
  const [tips, setTips] = useState('')
  const [wasHelpful, setWasHelpful] = useState(false)
  const [wouldRecommend, setWouldRecommend] = useState(false)
  const [visitedDate, setVisitedDate] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(true)

  // Check for existing review
  useEffect(() => {
    async function checkExistingReview() {
      if (!user) {
        setCheckingExisting(false)
        return
      }

      const existingReview = await getUserReview(user.id, resourceId)

      if (existingReview) {
        // Populate form with existing review
        setExistingReviewId(existingReview.id)
        setRating(existingReview.rating)
        setReviewText(existingReview.review_text || '')
        setPros(existingReview.pros || '')
        setCons(existingReview.cons || '')
        setTips(existingReview.tips || '')
        setWasHelpful(existingReview.was_helpful || false)
        setWouldRecommend(existingReview.would_recommend || false)
        setVisitedDate(existingReview.visited_date || '')
      }

      setCheckingExisting(false)
    }

    checkExistingReview()
  }, [user, resourceId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (!user) return

    // Validation
    if (!rating) {
      setError('Please provide a rating')
      return
    }

    if (!reviewText.trim()) {
      setError('Please write a review')
      return
    }

    if (reviewText.length > 500) {
      setError('Review must be 500 characters or less')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (existingReviewId) {
        // Update existing review
        const { error: updateError } = await updateReview(existingReviewId, {
          rating,
          review_text: reviewText,
          pros: pros || null,
          cons: cons || null,
          tips: tips || null,
          was_helpful: wasHelpful,
          would_recommend: wouldRecommend,
          visited_date: visitedDate || null,
        })

        if (updateError) {
          setError('Failed to update review. Please try again.')
        } else {
          setSuccess(true)
          setTimeout(() => {
            onSuccess?.()
          }, 1500)
        }
      } else {
        // Create new review
        const review: ResourceReviewInsert = {
          user_id: user.id,
          resource_id: resourceId,
          rating,
          review_text: reviewText,
          pros: pros || null,
          cons: cons || null,
          tips: tips || null,
          was_helpful: wasHelpful,
          would_recommend: wouldRecommend,
          visited_date: visitedDate || null,
        }

        const { error: submitError } = await submitReview(review)

        if (submitError) {
          setError('Failed to submit review. Please try again.')
        } else {
          setSuccess(true)
          setTimeout(() => {
            onSuccess?.()
          }, 1500)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (checkingExisting) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return (
      <Alert severity="info">
        Please{' '}
        <Button onClick={() => router.push('/auth/login')} sx={{ p: 0, minWidth: 'auto' }}>
          sign in
        </Button>{' '}
        to write a review.
      </Alert>
    )
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {existingReviewId ? 'Edit Your Review' : 'Write a Review'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Share your experience with {resourceName}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Review {existingReviewId ? 'updated' : 'submitted'} successfully!
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          {/* Rating */}
          <FormControl>
            <FormLabel>Your Rating *</FormLabel>
            <Rating
              value={rating}
              onChange={(_event, newValue) => setRating(newValue)}
              size="large"
              sx={{ mt: 1 }}
            />
          </FormControl>

          {/* Review Text */}
          <TextField
            label="Your Review"
            multiline
            rows={4}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            required
            inputProps={{ maxLength: 500 }}
            helperText={`${reviewText.length}/500 characters`}
            fullWidth
          />

          {/* Pros */}
          <TextField
            label="What did you like? (Optional)"
            multiline
            rows={2}
            value={pros}
            onChange={(e) => setPros(e.target.value)}
            fullWidth
          />

          {/* Cons */}
          <TextField
            label="What could be improved? (Optional)"
            multiline
            rows={2}
            value={cons}
            onChange={(e) => setCons(e.target.value)}
            fullWidth
          />

          {/* Tips */}
          <TextField
            label="Any tips for others? (Optional)"
            multiline
            rows={2}
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            fullWidth
          />

          {/* Visited Date */}
          <TextField
            label="When did you visit? (Optional)"
            type="date"
            value={visitedDate}
            onChange={(e) => setVisitedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* Checkboxes */}
          <Box>
            <FormControlLabel
              control={
                <Checkbox checked={wasHelpful} onChange={(e) => setWasHelpful(e.target.checked)} />
              }
              label="This resource was helpful to me"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={wouldRecommend}
                  onChange={(e) => setWouldRecommend(e.target.checked)}
                />
              }
              label="I would recommend this resource"
            />
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {onCancel && (
              <Button onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="contained" disabled={loading || success}>
              {loading ? (
                <CircularProgress size={24} />
              ) : existingReviewId ? (
                'Update Review'
              ) : (
                'Submit Review'
              )}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
