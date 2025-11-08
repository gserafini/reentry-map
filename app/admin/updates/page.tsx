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
  Link as MuiLink,
} from '@mui/material'
import { Flag as FlagIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'
import { getPendingUpdates, updateUpdateStatus } from '@/lib/api/updates'
import type { Database } from '@/lib/types/database'

type ResourceUpdate = Database['public']['Tables']['resource_updates']['Row'] & {
  resource?: { name: string }
  user?: { email: string | null; phone: string | null }
}

export default function AdminUpdatesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [updates, setUpdates] = useState<ResourceUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [selectedUpdate, setSelectedUpdate] = useState<ResourceUpdate | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<'applied' | 'rejected'>('applied')
  const [adminNotes, setAdminNotes] = useState('')

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/admin/updates')
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

  // Fetch pending updates
  useEffect(() => {
    async function fetchUpdates() {
      if (!isAdmin) return

      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getPendingUpdates()

      if (fetchError) {
        setError('Failed to load updates. Please try again.')
      } else {
        setUpdates((data as ResourceUpdate[]) || [])
      }

      setLoading(false)
    }

    if (isAdmin && !checkingAdmin) {
      fetchUpdates()
    }
  }, [isAdmin, checkingAdmin])

  const handleAction = (update: ResourceUpdate, type: 'applied' | 'rejected') => {
    setSelectedUpdate(update)
    setActionType(type)
    setShowActionDialog(true)
  }

  const confirmAction = async () => {
    if (!selectedUpdate) return

    setActionInProgress(true)

    const { error } = await updateUpdateStatus(selectedUpdate.id, actionType, adminNotes || undefined)

    if (error) {
      alert(`Failed to ${actionType} update`)
    } else {
      setUpdates((prev) => prev.filter((u) => u.id !== selectedUpdate.id))
      setShowActionDialog(false)
      setAdminNotes('')
      setSelectedUpdate(null)
    }

    setActionInProgress(false)
  }

  const getUpdateTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      incorrect_info: 'Incorrect Information',
      closed: 'Resource Closed',
      moved: 'Resource Moved',
      phone_wrong: 'Wrong Phone',
      address_wrong: 'Wrong Address',
      hours_wrong: 'Wrong Hours',
      other: 'Other Issue',
    }
    return labels[type] || type
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
            Review Issue Reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and address user-reported issues with resources
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

      {!loading && updates.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <FlagIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No pending reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            All issue reports have been reviewed!
          </Typography>
        </Box>
      )}

      {!loading && updates.length > 0 && (
        <Stack spacing={2}>
          {updates.map((update) => (
            <Card key={update.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {update.resource?.name || 'Unknown Resource'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip label={getUpdateTypeLabel(update.update_type)} size="small" color="error" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Reported: {new Date(update.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <MuiLink href={`/resources/${update.resource_id}`} target="_blank" rel="noopener noreferrer">
                    <Button size="small">View Resource</Button>
                  </MuiLink>
                </Box>

                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Description:</strong> {update.description}
                </Typography>

                {update.suggested_value && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Suggested Correction:</strong> {update.suggested_value}
                    </Typography>
                  </Alert>
                )}

                {update.user && (
                  <Typography variant="caption" color="text.secondary">
                    Reported by: {update.user.email || update.user.phone || 'Anonymous'}
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', gap: 1, px: 2, pb: 2 }}>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleAction(update, 'rejected')}
                  disabled={actionInProgress}
                >
                  Reject
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => handleAction(update, 'applied')}
                  disabled={actionInProgress}
                >
                  Mark as Applied
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onClose={() => setShowActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType === 'applied' ? 'Mark as Applied' : 'Reject Report'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            {actionType === 'applied'
              ? 'Add any notes about how this was addressed:'
              : 'Please provide a reason for rejecting this report:'}
          </Typography>
          <TextField
            multiline
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            fullWidth
            placeholder={actionType === 'applied' ? 'Optional notes' : 'This will be visible to the user'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowActionDialog(false)} disabled={actionInProgress}>
            Cancel
          </Button>
          <Button
            onClick={confirmAction}
            color={actionType === 'applied' ? 'success' : 'error'}
            variant="contained"
            disabled={actionInProgress}
          >
            {actionInProgress ? <CircularProgress size={24} /> : actionType === 'applied' ? 'Confirm' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
