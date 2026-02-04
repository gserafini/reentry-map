'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Grid,
  Divider,
} from '@mui/material'
import {
  AddCircle as AddCircleIcon,
  Send as SendIcon,
  MyLocation as GeocodeIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { submitSuggestion } from '@/lib/api/suggestions-client'
import { CATEGORIES } from '@/lib/utils/categories'
import { geocodeAddress } from '@/lib/utils/geocoding'
import type { Database } from '@/lib/types/database'

type ResourceSuggestionInsert = Database['public']['Tables']['resource_suggestions']['Insert']

export default function SuggestResourcePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [hours, setHours] = useState('')
  const [notes, setNotes] = useState('')

  // Geocoding state
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Ref for auto-focus
  const nameRef = useRef<HTMLInputElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/suggest-resource')
    }
  }, [authLoading, isAuthenticated, router])

  // Auto-focus name field on load
  useEffect(() => {
    if (isAuthenticated && nameRef.current) {
      nameRef.current.focus()
    }
  }, [isAuthenticated])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S - Submit
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSubmit(false)
      }
      // Ctrl+Shift+S / Cmd+Shift+S - Submit and suggest another
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
  }, [name, category, address])

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
        // Show brief success feedback
        setError(null)
        setTimeout(() => {
          // Clear any lingering messages
        }, 2000)
      } else {
        setError('Could not geocode address. You can still submit without coordinates.')
      }
    } catch {
      setError('Geocoding failed. You can submit without coordinates.')
    } finally {
      setGeocoding(false)
    }
  }

  const handleSubmit = async (submitAnother: boolean) => {
    if (!user) return

    // Validation
    if (!name.trim()) {
      setError('Resource name is required')
      return
    }

    if (!category) {
      setError('Please select a category')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const suggestion: ResourceSuggestionInsert = {
        suggested_by: user.id,
        name: name.trim(),
        description: description.trim() || null,
        category,
        address: address.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        reason: notes.trim() || null,
      }

      const { error: submitError } = await submitSuggestion(suggestion)

      if (submitError) {
        setError('Failed to submit suggestion. Please try again.')
      } else {
        setSuccess(true)

        if (submitAnother) {
          // Reset form but keep category
          const lastCategory = category
          resetForm()
          setCategory(lastCategory)
          setSuccess(false)
          nameRef.current?.focus()
        } else {
          // Redirect after success
          setTimeout(() => {
            router.push('/my-suggestions')
          }, 2000)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setCategory('')
    setAddress('')
    setPhone('')
    setEmail('')
    setWebsite('')
    setHours('')
    setNotes('')
    setLatitude(null)
    setLongitude(null)
    setError(null)
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <AddCircleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Suggest a Resource
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Know a resource that should be listed? Share it with the community!
        </Typography>
      </Box>

      {/* Keyboard Shortcuts Help */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Keyboard Shortcuts:</strong> Ctrl+S (Submit) | Ctrl+Shift+S (Submit & Add Another)
          | Ctrl+G (Geocode) | Tab (Next Field)
        </Typography>
      </Alert>

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Thank you! Your suggestion has been submitted and will be reviewed by our team.
          Redirecting...
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
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
            {/* Essential Fields */}
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
                helperText="Official name of the organization or program"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  label="Category"
                  onChange={(e) => setCategory(e.target.value)}
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
                fullWidth
                placeholder="123 Main St, Oakland, CA 94601"
                helperText="Full street address including city, state, and zip code"
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
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                placeholder="(510) 555-1234"
                helperText="Contact phone number"
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
                helperText="Contact email address"
              />
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Additional Details */}
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                Additional Details (Optional)
              </Typography>
            </Grid>

            <Grid size={12}>
              <TextField
                label="Description"
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                placeholder="What services does this resource provide?"
                helperText="Brief description of services offered"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                fullWidth
                placeholder="https://example.org"
                helperText="Organization website URL"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Hours of Operation"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                fullWidth
                placeholder="Mon-Fri 9am-5pm"
                helperText="When are they open?"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Additional Notes"
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                placeholder="Any other information that might be helpful..."
                helperText="Eligibility requirements, special programs, etc."
              />
            </Grid>

            {/* Action Buttons */}
            <Grid size={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" onClick={() => router.back()} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} /> : <AddCircleIcon />}
                  onClick={() => handleSubmit(true)}
                  disabled={loading || success}
                >
                  Submit & Add Another
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
                  disabled={loading || success}
                >
                  Submit Suggestion
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" gutterBottom>
          <strong>What happens next?</strong>
        </Typography>
        <Typography variant="body2">
          Our team will review your suggestion and verify the information. You can check the status
          of your submission on the &ldquo;My Suggestions&rdquo; page. Approved suggestions will be
          added to the resource directory.
        </Typography>
      </Alert>
    </Container>
  )
}
