'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Lightbulb as LightbulbIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'
import { getPendingSuggestions, updateSuggestionStatus } from '@/lib/api/suggestions'
import type { Database } from '@/lib/types/database'

type ResourceSuggestion = Database['public']['Tables']['resource_suggestions']['Row']

export default function AdminSuggestionsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [suggestions, setSuggestions] = useState<ResourceSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<ResourceSuggestion | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/admin/suggestions')
        return
      }

      if (user) {
        const adminStatus = await checkCurrentUserIsAdmin()
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          router.push('/')
        }

        setCheckingAdmin(false)
      }
    }

    checkAdmin()
  }, [user, authLoading, isAuthenticated, router])

  // Fetch pending suggestions
  useEffect(() => {
    async function fetchSuggestions() {
      if (!isAdmin) return

      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getPendingSuggestions()

      if (fetchError) {
        setError('Failed to load suggestions. Please try again.')
      } else {
        setSuggestions(data || [])
      }

      setLoading(false)
    }

    if (isAdmin && !checkingAdmin) {
      fetchSuggestions()
    }
  }, [isAdmin, checkingAdmin])

  const handleApprove = async (suggestion: ResourceSuggestion) => {
    setActionInProgress(true)

    const { error } = await updateSuggestionStatus(suggestion.id, 'approved', 'Approved and added to resources')

    if (error) {
      alert('Failed to approve suggestion')
    } else {
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
    }

    setActionInProgress(false)
  }

  const handleReject = (suggestion: ResourceSuggestion) => {
    setSelectedSuggestion(suggestion)
    setShowRejectDialog(true)
  }

  const confirmReject = async () => {
    if (!selectedSuggestion) return

    setActionInProgress(true)

    const { error } = await updateSuggestionStatus(selectedSuggestion.id, 'rejected', adminNotes || 'Rejected')

    if (error) {
      alert('Failed to reject suggestion')
    } else {
      setSuggestions((prev) => prev.filter((s) => s.id !== selectedSuggestion.id))
      setShowRejectDialog(false)
      setAdminNotes('')
      setSelectedSuggestion(null)
    }

    setActionInProgress(false)
  }

  const handleMarkDuplicate = async (suggestion: ResourceSuggestion) => {
    setActionInProgress(true)

    const { error } = await updateSuggestionStatus(suggestion.id, 'duplicate', 'Marked as duplicate')

    if (error) {
      alert('Failed to mark as duplicate')
    } else {
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
    }

    setActionInProgress(false)
  }

  if (authLoading || checkingAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Review Suggestions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and approve community-submitted resource suggestions
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => router.push('/admin')}>
          Back to Dashboard
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && suggestions.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <LightbulbIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No pending suggestions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            All suggestions have been reviewed!
          </Typography>
        </Box>
      )}

      {!loading && suggestions.length > 0 && (
        <Stack spacing={2}>
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {suggestion.name}
                    </Typography>
                    <Chip label={suggestion.category} size="small" sx={{ mb: 1 }} />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Submitted: {new Date(suggestion.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                {suggestion.description && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {suggestion.description}
                  </Typography>
                )}

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2 }}>
                  {suggestion.address && (
                    <Typography variant="body2">
                      <strong>Address:</strong> {suggestion.address}
                    </Typography>
                  )}
                  {suggestion.phone && (
                    <Typography variant="body2">
                      <strong>Phone:</strong> {suggestion.phone}
                    </Typography>
                  )}
                  {suggestion.email && (
                    <Typography variant="body2">
                      <strong>Email:</strong> {suggestion.email}
                    </Typography>
                  )}
                  {suggestion.website && (
                    <Typography variant="body2">
                      <strong>Website:</strong>{' '}
                      <a href={suggestion.website} target="_blank" rel="noopener noreferrer">
                        {suggestion.website}
                      </a>
                    </Typography>
                  )}
                </Box>

                {suggestion.hours && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    <strong>Hours:</strong> {suggestion.hours}
                  </Typography>
                )}

                {suggestion.notes && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Notes:</strong> {suggestion.notes}
                    </Typography>
                  </Alert>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', gap: 1, px: 2, pb: 2 }}>
                <Button
                  size="small"
                  onClick={() => handleMarkDuplicate(suggestion)}
                  disabled={actionInProgress}
                >
                  Mark Duplicate
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleReject(suggestion)}
                  disabled={actionInProgress}
                >
                  Reject
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => handleApprove(suggestion)}
                  disabled={actionInProgress}
                >
                  Approve
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Suggestion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Please provide a reason for rejecting this suggestion:
          </Typography>
          <TextField
            multiline
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            fullWidth
            placeholder="This will be visible to the user"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)} disabled={actionInProgress}>
            Cancel
          </Button>
          <Button
            onClick={confirmReject}
            color="error"
            variant="contained"
            disabled={actionInProgress}
          >
            {actionInProgress ? <CircularProgress size={24} /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
