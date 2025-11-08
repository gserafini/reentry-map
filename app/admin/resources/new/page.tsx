'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
} from '@mui/material'
import {
  Save as SaveIcon,
  Add as AddIcon,
  ContentCopy as CopyIcon,
  MyLocation as GeocodeIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'
import { CATEGORIES } from '@/lib/utils/categories'
import { geocodeAddress } from '@/lib/utils/geocoding'

export default function NewResourcePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  // Form state - minimal required fields for rapid entry
  const [name, setName] = useState('')
  const [primary_category, setPrimaryCategory] = useState('general_support')
  const [address, setAddress] = useState('')
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Ref for auto-focus
  const nameRef = useRef<HTMLInputElement>(null)

  // Check admin
  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/admin/resources/new')
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
  }, [user, authLoading, isAuthenticated, router])

  // Auto-focus name field on load
  useEffect(() => {
    if (isAdmin && nameRef.current) {
      nameRef.current.focus()
    }
  }, [isAdmin])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSubmit(false)
      }
      // Ctrl+Shift+S / Cmd+Shift+S - Save and add another
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        handleSubmit(true)
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
  }, [name, address, primary_category]) // handleGeocode and handleSubmit are stable

  const handleGeocode = async () => {
    if (!address) {
      setError('Please enter an address first')
      return
    }

    setGeocoding(true)
    setError(null)

    try {
      const coords = await geocodeAddress(address)
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

  const handleSubmit = async (addAnother: boolean) => {
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

      const response = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resource),
      })

      if (!response.ok) throw new Error('Failed to create resource')

      if (addAnother) {
        // Reset form but keep category and some defaults
        const lastCategory = primary_category
        resetForm()
        setPrimaryCategory(lastCategory)
        setStatus(status)
        setVerified(verified)
        nameRef.current?.focus()
      } else {
        router.push('/admin/resources')
      }
    } catch (err) {
      setError('Failed to create resource. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setName('')
    setAddress('')
    setPhone('')
    setDescription('')
    setWebsite('')
    setHours('')
    setEmail('')
    setServices('')
    setLatitude(null)
    setLongitude(null)
    setError(null)
  }

  const copyLastEntry = () => {
    // This would ideally load the last created resource
    // For now, just show a message
    alert('Copy last entry feature - would copy previous resource details')
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

  if (!isAdmin) return null

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Add New Resource
        </Typography>
        <Button variant="outlined" onClick={() => router.push('/admin/resources')}>
          Back to List
        </Button>
      </Box>

      {/* Keyboard Shortcuts Help */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Keyboard Shortcuts:</strong> Ctrl+S (Save) | Ctrl+Shift+S (Save & Add Another) |
          Ctrl+G (Geocode) | Tab (Next Field)
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Coordinates added successfully!
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit(false)
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

            <Grid size={{ xs: 12, md: 9 }}>
              <TextField
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                fullWidth
                placeholder="123 Main St, Oakland, CA 94601"
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
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/admin/resources')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CopyIcon />}
                  onClick={copyLastEntry}
                  disabled={saving}
                >
                  Copy Last
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}
                  onClick={() => handleSubmit(true)}
                  disabled={saving}
                >
                  Save & Add Another
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                  disabled={saving}
                >
                  Save
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  )
}
