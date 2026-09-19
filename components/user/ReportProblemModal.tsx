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
import { submitUpdate } from '@/lib/api/updates-client'
import type { ResourceUpdateReportInsert } from '@/lib/types/database'

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
 * - Guests can submit factual corrections for moderation
 * - Multiple issue types
 * - Optional description and suggested correction
 */
export function ReportProblemModal({
  open,
  onClose,
  resourceId,
  resourceName,
}: ReportProblemModalProps) {
  // Form state
  const [updateType, setUpdateType] = useState('')
  const [description, setDescription] = useState('')
  const [suggestedValue, setSuggestedValue] = useState('')
  const [contactWebsite, setContactWebsite] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleClose = () => {
    if (!loading) {
      setUpdateType('')
      setDescription('')
      setSuggestedValue('')
      setContactWebsite('')
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!updateType) {
      setError('Please select an issue type')
      return
    }

    if (description.trim().length < 3) {
      setError('Please describe the issue in at least 3 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const update: ResourceUpdateReportInsert & { contact_website: string } = {
        contact_website: contactWebsite,
        resource_id: resourceId,
        update_type: updateType,
        description: description.trim(),
        new_value: suggestedValue.trim() || null,
      }

      const { error: submitError } = await submitUpdate(update)

      if (submitError) {
        setError(submitError)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
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
          <input
            name="contact_website"
            aria-hidden="true"
            tabIndex={-1}
            autoComplete="off"
            value={contactWebsite}
            onChange={(e) => setContactWebsite(e.target.value)}
            style={{ display: 'none' }}
          />
          <Alert severity="info" sx={{ mb: 3 }}>
            Reporting issue with: <strong>{resourceName}</strong>. No account needed. Reports are
            reviewed privately before any listing changes. Please leave out personal or medical
            information.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Report submitted for review. The listing has not changed yet.
            </Alert>
          )}

          <FormControl fullWidth required sx={{ mb: 3 }}>
            <InputLabel id="report-issue-label">Issue Type</InputLabel>
            <Select
              labelId="report-issue-label"
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
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            helperText="Please describe the issue in detail"
          />

          <TextField
            label="Suggested Correction (Optional)"
            multiline
            rows={2}
            value={suggestedValue}
            onChange={(e) => setSuggestedValue(e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            helperText="If you know the correct information, please share it here"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            {success ? 'Done' : 'Cancel'}
          </Button>
          <Button type="submit" variant="contained" disabled={loading || success}>
            {loading ? <CircularProgress size={24} /> : 'Submit Report'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
