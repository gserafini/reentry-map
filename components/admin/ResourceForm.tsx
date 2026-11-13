'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Typography,
} from '@mui/material'
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material'
import type { Database } from '@/lib/types/database'
import { CATEGORIES } from '@/lib/utils/categories'

type Resource = Database['public']['Tables']['resources']['Row']
type ResourceInsert = Database['public']['Tables']['resources']['Insert']

interface ResourceFormProps {
  resource?: Resource
  onSubmit: (data: Partial<ResourceInsert>) => Promise<{ success: boolean; error?: string }>
  onCancel: () => void
}

const STATUS_OPTIONS = ['active', 'inactive', 'flagged', 'pending_verification']

// Keys match the admin resources API (snake_case columns). List fields are edited one item
// per line.
interface FormState {
  name: string
  description: string
  services_offered: string
  primary_category: string
  status: string
  phone: string
  email: string
  website: string
  address: string
  eligibility_requirements: string
  required_documents: string
  fees: string
  record_restrictions: string
  reentry_focused: boolean
}

const LIST_FIELDS = new Set<keyof FormState>(['services_offered', 'required_documents'])

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function lines(value: unknown): string {
  if (Array.isArray(value))
    return value.filter((item) => typeof item === 'string' && item).join('\n')
  return text(value)
}

function initialState(resource?: Resource): FormState {
  const row = (resource ?? {}) as Record<string, unknown>
  return {
    name: text(row.name),
    description: text(row.description),
    services_offered: lines(row.services_offered),
    // Stored categories are hyphenated (general-support); older rows may use underscores.
    primary_category: text(row.primary_category).replace(/_/g, '-') || 'general-support',
    status: text(row.status) || 'active',
    phone: text(row.phone),
    email: text(row.email),
    website: text(row.website),
    address: text(row.address),
    eligibility_requirements: text(row.eligibility_requirements),
    required_documents: lines(row.required_documents),
    fees: text(row.fees),
    record_restrictions: text(row.record_restrictions),
    reentry_focused: row.reentry_focused === true,
  }
}

/**
 * The API payload: every field when creating (initial = null), otherwise only the fields the
 * editor changed, so untouched columns are never rewritten.
 */
function toPayload(initial: FormState | null, current: FormState): Partial<ResourceInsert> {
  const payload: Record<string, unknown> = {}
  for (const key of Object.keys(current) as (keyof FormState)[]) {
    const value = current[key]
    if (initial && value === initial[key]) continue
    if (typeof value === 'boolean') {
      payload[key] = value
    } else if (LIST_FIELDS.has(key)) {
      const items = value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
      payload[key] = items.length ? items : null
    } else {
      payload[key] = value.trim() || null
    }
  }
  return payload as Partial<ResourceInsert>
}

export function ResourceForm({ resource, onSubmit, onCancel }: ResourceFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initial] = useState(() => initialState(resource))
  const [formData, setFormData] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const statusOptions = STATUS_OPTIONS.includes(initial.status)
    ? STATUS_OPTIONS
    : [...STATUS_OPTIONS, initial.status]

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

  function done() {
    router.push('/admin/resources')
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) {
      return
    }

    const payload = toPayload(resource ? initial : null, formData)
    if (Object.keys(payload).length === 0) {
      done()
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await onSubmit(payload)

      if (result.success) {
        done()
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
            value={formData.services_offered}
            onChange={(e) => setFormData({ ...formData, services_offered: e.target.value })}
            fullWidth
            multiline
            rows={3}
            helperText="One service per line"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth required>
            <InputLabel id="resource-category-label">Primary Category</InputLabel>
            <Select
              labelId="resource-category-label"
              value={formData.primary_category}
              onChange={(e) => setFormData({ ...formData, primary_category: e.target.value })}
              label="Primary Category"
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel id="resource-status-label">Status</InputLabel>
            <Select
              labelId="resource-status-label"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              label="Status"
            >
              {statusOptions.map((status) => (
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
            value={formData.eligibility_requirements}
            onChange={(e) => setFormData({ ...formData, eligibility_requirements: e.target.value })}
            fullWidth
            multiline
            rows={2}
            helperText="Who is eligible to use this resource?"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Documents Required"
            value={formData.required_documents}
            onChange={(e) => setFormData({ ...formData, required_documents: e.target.value })}
            fullWidth
            multiline
            rows={2}
            helperText="One document per line"
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

        {/* Records */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Criminal records
          </Typography>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Record-related restrictions"
            value={formData.record_restrictions}
            onChange={(e) => setFormData({ ...formData, record_restrictions: e.target.value })}
            fullWidth
            multiline
            rows={2}
            helperText="Only restrictions the provider states about records, registries, specific offenses, background checks or supervision, in the provider’s words. Leave empty when the provider says nothing."
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.reentry_focused}
                onChange={(e) => setFormData({ ...formData, reentry_focused: e.target.checked })}
              />
            }
            label="Built for people with records"
          />
          <Typography variant="caption" color="text.secondary" component="p">
            Check only when the provider says the program is specifically for people with records or
            justice involvement.
          </Typography>
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
