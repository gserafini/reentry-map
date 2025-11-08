'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Typography,
} from '@mui/material'
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material'
import type { Database } from '@/lib/types/database'

type Resource = Database['public']['Tables']['resources']['Row']
type ResourceInsert = Database['public']['Tables']['resources']['Insert']

interface ResourceFormProps {
  resource?: Resource
  onSubmit: (data: Partial<ResourceInsert>) => Promise<{ success: boolean; error?: string }>
  onCancel: () => void
}

const CATEGORIES = [
  'employment',
  'housing',
  'food',
  'clothing',
  'healthcare',
  'mental_health',
  'substance_abuse',
  'legal_aid',
  'transportation',
  'id_documents',
  'education',
  'faith_based',
  'general_support',
]

const STATUS_OPTIONS = ['active', 'inactive', 'pending_verification']

export function ResourceForm({ resource, onSubmit, onCancel }: ResourceFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: resource?.name || '',
    description: resource?.description || '',
    services: ((resource as Record<string, unknown>)?.services as string | undefined) || '',
    primary_category: resource?.primary_category || 'general_support',
    status: resource?.status || 'active',
    phone: resource?.phone || '',
    email: resource?.email || '',
    website: resource?.website || '',
    address: resource?.address || '',
    eligibility: ((resource as Record<string, unknown>)?.eligibility as string | undefined) || '',
    application_process:
      ((resource as Record<string, unknown>)?.application_process as string | undefined) || '',
    documents_required:
      ((resource as Record<string, unknown>)?.documents_required as string | undefined) || '',
    fees: ((resource as Record<string, unknown>)?.fees as string | undefined) || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await onSubmit(formData)

      if (result.success) {
        router.push('/admin/resources')
        router.refresh()
      } else {
        setError(result.error || 'Failed to save resource')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Resource Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            required
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={!!errors.description}
            helperText={errors.description}
            fullWidth
            required
            multiline
            rows={4}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Services Offered"
            value={formData.services}
            onChange={(e) => setFormData({ ...formData, services: e.target.value })}
            fullWidth
            multiline
            rows={3}
            helperText="Describe what services this resource provides"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth required>
            <InputLabel>Primary Category</InputLabel>
            <Select
              value={formData.primary_category}
              onChange={(e) => setFormData({ ...formData, primary_category: e.target.value })}
              label="Primary Category"
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              label="Status"
            >
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Contact Information */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Contact Information
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={!!errors.phone}
            helperText={errors.phone || 'Format: (555) 123-4567'}
            fullWidth
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={!!errors.email}
            helperText={errors.email}
            fullWidth
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            error={!!errors.website}
            helperText={errors.website}
            fullWidth
          />
        </Grid>

        {/* Location */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Location
          </Typography>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={!!errors.address}
            helperText={errors.address || 'Full street address including city, state, and ZIP'}
            fullWidth
            required
          />
        </Grid>

        {/* Additional Details */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Additional Details
          </Typography>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Eligibility Requirements"
            value={formData.eligibility}
            onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
            fullWidth
            multiline
            rows={2}
            helperText="Who is eligible to use this resource?"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Application Process"
            value={formData.application_process}
            onChange={(e) => setFormData({ ...formData, application_process: e.target.value })}
            fullWidth
            multiline
            rows={2}
            helperText="How to apply or get started"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Documents Required"
            value={formData.documents_required}
            onChange={(e) => setFormData({ ...formData, documents_required: e.target.value })}
            fullWidth
            multiline
            rows={2}
            helperText="What documents are needed?"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Fees"
            value={formData.fees}
            onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
            fullWidth
            helperText="Any costs or fees associated with this resource"
          />
        </Grid>

        {/* Actions */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
              {saving ? 'Saving...' : resource ? 'Update Resource' : 'Create Resource'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  )
}
