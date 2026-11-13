'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  MyLocation as GeocodeIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'
import { CATEGORIES } from '@/lib/utils/categories'
import { geocodeAddress } from '@/lib/utils/geocoding'
import type { Resource } from '@/lib/db/schema'

// The form's values, as loaded and as edited. A save sends only the fields that differ, under
// the API's field names, so untouched data (such as structured hours) is never rewritten.
interface EditValues {
  name: string
  primary_category: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  description: string
  website: string
  hours: string
  email: string
  services: string
  record_restrictions: string
  reentry_focused: boolean
  verified: boolean
  status: string
  latitude: number | null
  longitude: number | null
}

/** Hours edited as JSON stay structured; anything else is free text. */
function parseHours(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // Not JSON: keep the text
    }
  }
  return trimmed
}

function changedPayload(original: EditValues, current: EditValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const key of Object.keys(current) as (keyof EditValues)[]) {
    const value = current[key]
    if (value === original[key]) continue
    if (key === 'services') {
      const items = String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      payload.services_offered = items.length ? items : null
    } else if (key === 'hours') {
      payload.hours = parseHours(String(value))
    } else if (typeof value === 'string') {
      payload[key] = value.trim() || null
    } else {
      payload[key] = value
    }
  }
  return payload
}

export default function EditResourcePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const params = useParams()
  const resourceId = params.id as string

  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [loading, setLoading] = useState(true)

  // Form state
  const [name, setName] = useState('')
  const [primary_category, setPrimaryCategory] = useState('general-support')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [hours, setHours] = useState('')
  const [email, setEmail] = useState('')
  const [services, setServices] = useState('')
  const [recordRestrictions, setRecordRestrictions] = useState('')
  const [reentryFocused, setReentryFocused] = useState(false)
  const [verified, setVerified] = useState(false)
  const [status, setStatus] = useState('active')
  // Values as loaded, so a save sends only what the editor changed
  const [original, setOriginal] = useState<EditValues | null>(null)

  // Geocoding state
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  // UI state
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Ref for auto-focus
  const nameRef = useRef<HTMLInputElement>(null)

  // Check admin
  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push(`/auth/login?redirect=/admin/resources/${resourceId}/edit`)
        return
      }
      if (user) {
        const adminStatus = await checkCurrentUserIsAdmin()
        setIsAdmin(adminStatus)
        if (!adminStatus) router.push('/')
        setCheckingAdmin(false)
      }
    }
    checkAdmin()
  }, [user, authLoading, isAuthenticated, router, resourceId])

  // Load resource data
  useEffect(() => {
    async function loadResource() {
      if (!isAdmin) return

      try {
        const response = await fetch(`/api/admin/resources/${resourceId}`)
        if (!response.ok) throw new Error('Failed to load resource')

        const result = (await response.json()) as { data: Resource }
        const { data } = result

        // Populate form fields
        const values: EditValues = {
          name: data.name || '',
          primary_category: data.primaryCategory || 'general-support',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          phone: data.phone || '',
          description: data.description || '',
          website: data.website || '',
          hours:
            typeof data.hours === 'string'
              ? data.hours
              : data.hours
                ? JSON.stringify(data.hours)
                : '',
          email: data.email || '',
          services: Array.isArray(data.servicesOffered) ? data.servicesOffered.join(', ') : '',
          record_restrictions: data.recordRestrictions || '',
          reentry_focused: data.reentryFocused === true,
          verified: data.verified || false,
          status: data.status || 'active',
          latitude: data.latitude,
          longitude: data.longitude,
        }
        setName(values.name)
        setPrimaryCategory(values.primary_category)
        setAddress(values.address)
        setCity(values.city)
        setState(values.state)
        setZip(values.zip)
        setPhone(values.phone)
        setDescription(values.description)
        setWebsite(values.website)
        setHours(values.hours)
        setEmail(values.email)
        setServices(values.services)
        setRecordRestrictions(values.record_restrictions)
        setReentryFocused(values.reentry_focused)
        setVerified(values.verified)
        setStatus(values.status)
        setLatitude(values.latitude)
        setLongitude(values.longitude)
        setOriginal(values)
      } catch (err) {
        setError('Failed to load resource. Please try again.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadResource()
  }, [isAdmin, resourceId])

  // Auto-focus name field on load
  useEffect(() => {
    if (!loading && isAdmin && nameRef.current) {
      nameRef.current.focus()
    }
  }, [loading, isAdmin])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSubmit()
      }
      // Ctrl+G / Cmd+G - Geocode address
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        handleGeocode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, address, primary_category])

  const handleGeocode = async () => {
    if (!address) {
      setError('Please enter an address first')
      return
    }

    setGeocoding(true)
    setError(null)

    try {
      // Build full address for better geocoding accuracy
      const fullAddress = [address, city, state, zip].filter(Boolean).join(', ')
      const coords = await geocodeAddress(fullAddress)
      if (coords) {
        setLatitude(coords.latitude)
        setLongitude(coords.longitude)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } else {
        setError('Could not geocode address. Check the address and try again.')
      }
    } catch {
      setError('Geocoding failed. You can save without coordinates.')
    } finally {
      setGeocoding(false)
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!address.trim()) {
      setError('Address is required')
      return
    }

    if (!original) return
    const resource = changedPayload(original, {
      name,
      primary_category,
      address,
      city,
      state,
      zip,
      phone,
      description,
      website,
      hours,
      email,
      services,
      record_restrictions: recordRestrictions,
      reentry_focused: reentryFocused,
      verified,
      status,
      latitude,
      longitude,
    })
    if (Object.keys(resource).length === 0) {
      router.push('/admin/resources')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/resources/${resourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resource),
      })

      if (!response.ok) throw new Error('Failed to update resource')

      router.push('/admin/resources')
    } catch (err) {
      setError('Failed to update resource. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/resources/${resourceId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete resource')

      router.push('/admin/resources')
    } catch (err) {
      setError('Failed to delete resource. Please try again.')
      console.error(err)
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (authLoading || checkingAdmin || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!isAdmin) return null

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Edit Resource
        </Typography>
        <Button variant="outlined" onClick={() => router.push('/admin/resources')}>
          Back to List
        </Button>
      </Box>

      {/* Keyboard Shortcuts Help */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Keyboard Shortcuts:</strong> Ctrl+S (Save) | Ctrl+G (Geocode) | Tab (Next Field)
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Coordinates updated successfully!
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <Grid container spacing={3}>
            {/* Essential Fields - Always Visible */}
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                Essential Information *
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                inputRef={nameRef}
                label="Resource Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
                placeholder="e.g., Oakland Job Center"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth required>
                <InputLabel id="edit-category-label">Category</InputLabel>
                <Select
                  labelId="edit-category-label"
                  value={primary_category}
                  label="Category"
                  onChange={(e) => setPrimaryCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={12}>
              <TextField
                label="Street Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                fullWidth
                placeholder="123 Main St"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                fullWidth
                placeholder="Oakland"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                fullWidth
                placeholder="CA"
                inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                label="Zip Code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                fullWidth
                placeholder="94601"
                inputProps={{ maxLength: 10 }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                variant="outlined"
                onClick={handleGeocode}
                disabled={geocoding || !address}
                startIcon={geocoding ? <CircularProgress size={16} /> : <GeocodeIcon />}
                fullWidth
                sx={{ height: '56px' }}
              >
                Geocode
              </Button>
            </Grid>

            {latitude && longitude && (
              <Grid size={12}>
                <Alert severity="success">
                  Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </Alert>
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                placeholder="(510) 555-1234"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                placeholder="contact@example.org"
              />
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Additional Fields - Optional */}
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                Additional Details (Optional)
              </Typography>
            </Grid>

            <Grid size={12}>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                fullWidth
                placeholder="Brief description of services..."
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                fullWidth
                placeholder="https://example.org"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                fullWidth
                placeholder="Mon-Fri 9am-5pm"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Services (comma-separated)"
                value={services}
                onChange={(e) => setServices(e.target.value)}
                fullWidth
                placeholder="Job training, Resume help, Interview prep"
                helperText="Separate multiple services with commas"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Record-related restrictions"
                value={recordRestrictions}
                onChange={(e) => setRecordRestrictions(e.target.value)}
                multiline
                rows={2}
                fullWidth
                helperText="Only restrictions the provider states about records, registries, specific offenses, background checks or supervision, in the provider’s words. Leave empty when the provider says nothing."
              />
            </Grid>

            <Grid size={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reentryFocused}
                    onChange={(e) => setReentryFocused(e.target.checked)}
                  />
                }
                label="Built for people with records"
              />
              <Typography variant="caption" color="text.secondary" component="p">
                Check only when the provider says the program is specifically for people with
                records or justice involvement.
              </Typography>
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Status Options */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="edit-status-label">Status</InputLabel>
                <Select
                  labelId="edit-status-label"
                  value={status}
                  label="Status"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="pending">Pending Review</MenuItem>
                  <MenuItem value="flagged">Flagged</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox checked={verified} onChange={(e) => setVerified(e.target.checked)} />
                }
                label="Mark as Verified"
              />
            </Grid>

            {/* Action Buttons */}
            <Grid size={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', mt: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={saving || deleting}
                >
                  Delete
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => router.push('/admin/resources')}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="success"
                    startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                    disabled={saving}
                  >
                    Save Changes
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Resource?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{name}&quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
