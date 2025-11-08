'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import { AddCircle as AddCircleIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { submitSuggestion } from '@/lib/api/suggestions'
import { CATEGORIES } from '@/lib/utils/categories'
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

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/suggest-resource')
    }
  }, [authLoading, isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        category,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        hours: hours.trim() || null,
        notes: notes.trim() || null,
      }

      const { error: submitError } = await submitSuggestion(suggestion)

      if (submitError) {
        setError('Failed to submit suggestion. Please try again.')
      } else {
        setSuccess(true)
        // Reset form
        setName('')
        setDescription('')
        setCategory('')
        setAddress('')
        setPhone('')
        setEmail('')
        setWebsite('')
        setHours('')
        setNotes('')

        // Redirect after success
        setTimeout(() => {
          router.push('/my-suggestions')
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <AddCircleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Suggest a Resource
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Know a resource that should be listed? Share it with the community!
        </Typography>
      </Box>

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Thank you! Your suggestion has been submitted and will be reviewed by our team.
          Redirecting...
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Resource Name */}
            <TextField
              label="Resource Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              helperText="Official name of the organization or program"
            />

            {/* Category */}
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Description */}
            <TextField
              label="Description"
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              helperText="What services does this resource provide?"
            />

            {/* Address */}
            <TextField
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              fullWidth
              helperText="Full street address including city, state, and zip code"
            />

            {/* Contact Information */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                helperText="Contact phone number"
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                helperText="Contact email address"
              />
            </Box>

            {/* Website */}
            <TextField
              label="Website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              fullWidth
              helperText="Organization website URL"
            />

            {/* Hours */}
            <TextField
              label="Hours of Operation"
              multiline
              rows={2}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              fullWidth
              helperText="e.g., Monday-Friday 9am-5pm"
            />

            {/* Additional Notes */}
            <TextField
              label="Additional Notes"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              helperText="Any other information that might be helpful (eligibility requirements, special programs, etc.)"
            />

            {/* Submit Button */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={() => router.back()} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={loading || success} size="large">
                {loading ? <CircularProgress size={24} /> : 'Submit Suggestion'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" gutterBottom>
          <strong>What happens next?</strong>
        </Typography>
        <Typography variant="body2">
          Our team will review your suggestion and verify the information. You can check the status of
          your submission on the "My Suggestions" page. Approved suggestions will be added to the
          resource directory.
        </Typography>
      </Alert>
    </Container>
  )
}
