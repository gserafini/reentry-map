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
import type { Resource } from '@/lib/types/database'

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
  const [primary_category, setPrimaryCategory] = useState('general_support')
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
  const [verified, setVerified] = useState(false)
  const [status, setStatus] = useState('active')

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
        setName(data.name || '')
        setPrimaryCategory(data.primary_category || 'general_support')
        setAddress(data.address || '')
        setCity(data.city || '')
        setState(data.state || '')
        setZip(data.zip || '')
        setPhone(data.phone || '')
        setDescription(data.description || '')
        setWebsite(data.website || '')
        setHours(
          typeof data.hours === 'string' ? data.hours : data.hours ? JSON.stringify(data.hours) : ''
        )
        setEmail(data.email || '')
        setServices(Array.isArray(data.services_offered) ? data.services_offered.join(', ') : '')
        setVerified(data.verified || false)
        setStatus(data.status || 'active')
        setLatitude(data.latitude)
        setLongitude(data.longitude)
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

    setSaving(true)
    setError(null)

    try {
      const resource = {
        name: name.trim(),
        primary_category,
        address: address.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        zip: zip.trim() || null,
        phone: phone.trim() || null,
        description: description.trim() || null,
        website: website.trim() || null,
        hours: hours.trim() || null,
        email: email.trim() || null,
        services: services ? services.split(',').map((s) => s.trim()) : null,
        verified,
        status,
        latitude,
        longitude,
      }

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
                <InputLabel>Category</InputLabel>
                <Select
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

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Status Options */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="pending">Pending Review</MenuItem>
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
