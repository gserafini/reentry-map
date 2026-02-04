'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { submitUpdate } from '@/lib/api/updates-client'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/types/database'

type ResourceUpdateInsert = Database['public']['Tables']['resource_updates']['Insert']

interface ReportProblemModalProps {
  open: boolean
  onClose: () => void
  resourceId: string
  resourceName: string
}

const UPDATE_TYPES = [
  { value: 'incorrect_info', label: 'Incorrect Information' },
  { value: 'closed', label: 'Resource is Closed' },
  { value: 'moved', label: 'Resource Has Moved' },
  { value: 'phone_wrong', label: 'Wrong Phone Number' },
  { value: 'address_wrong', label: 'Wrong Address' },
  { value: 'hours_wrong', label: 'Incorrect Hours' },
  { value: 'other', label: 'Other Issue' },
]

/**
 * ReportProblemModal component
 *
 * Modal for reporting issues with a resource
 * - Requires authentication
 * - Multiple issue types
 * - Optional description and suggested correction
 */
export function ReportProblemModal({
  open,
  onClose,
  resourceId,
  resourceName,
}: ReportProblemModalProps) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  // Form state
  const [updateType, setUpdateType] = useState('')
  const [description, setDescription] = useState('')
  const [suggestedValue, setSuggestedValue] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleClose = () => {
    if (!loading) {
      setUpdateType('')
      setDescription('')
      setSuggestedValue('')
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (!user) return

    // Validation
    if (!updateType) {
      setError('Please select an issue type')
      return
    }

    if (!description.trim()) {
      setError('Please provide a description')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const update: ResourceUpdateInsert = {
        reported_by: user.id,
        resource_id: resourceId,
        update_type: updateType,
        description: description.trim(),
        new_value: suggestedValue.trim() || null,
      }

      const { error: submitError } = await submitUpdate(update)

      if (submitError) {
        setError('Failed to submit report. Please try again.')
      } else {
        setSuccess(true)
        setTimeout(() => {
          handleClose()
        }, 1500)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Report a Problem</DialogTitle>
        <DialogContent>
          <Alert severity="info">Please sign in to report issues with this resource.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Report a Problem
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Reporting issue with: <strong>{resourceName}</strong>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Report submitted successfully! Our team will review it soon.
            </Alert>
          )}

          <FormControl fullWidth required sx={{ mb: 3 }}>
            <InputLabel>Issue Type</InputLabel>
            <Select
              value={updateType}
              label="Issue Type"
              onChange={(e) => setUpdateType(e.target.value)}
            >
              {UPDATE_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            sx={{ mb: 3 }}
            helperText="Please describe the issue in detail"
          />

          <TextField
            label="Suggested Correction (Optional)"
            multiline
            rows={2}
            value={suggestedValue}
            onChange={(e) => setSuggestedValue(e.target.value)}
            fullWidth
            helperText="If you know the correct information, please share it here"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading || success}>
            {loading ? <CircularProgress size={24} /> : 'Submit Report'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
