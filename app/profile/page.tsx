'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Typography,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { getInitials, getAvatarColor, getUserDisplayName } from '@/lib/utils/avatar'
import { useGravatar } from '@/lib/hooks/useGravatar'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types/database'

export default function ProfilePage() {
  const { user: authUser, isLoading: authLoading, isAuthenticated, signOut } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<User | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const { gravatarUrl, hasGravatar } = useGravatar(authUser?.email, 160)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch user profile via API route
  const fetchProfile = useCallback(async () => {
    if (!authUser) {
      setIsLoadingProfile(false)
      return
    }

    try {
      const res = await fetch('/api/profile')

      if (!res.ok) {
        const errorData = (await res.json()) as { error?: string }
        throw new Error(errorData.error || `Failed to fetch profile (${res.status})`)
      }

      const { data } = (await res.json()) as { data: User | null }

      if (data) {
        setProfile(data)
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null
            ? JSON.stringify(err)
            : 'Unknown error'
      setError(`Failed to load profile: ${errorMessage}`)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [authUser])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    if (!authUser || !profile) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      })

      if (!res.ok) {
        const errorData = (await res.json()) as { error?: string }
        throw new Error(errorData.error || `Failed to update profile (${res.status})`)
      }

      const { data } = (await res.json()) as { data: User }

      setProfile(data)
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFirstName(profile?.first_name || '')
    setLastName(profile?.last_name || '')
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  if (authLoading || isLoadingProfile) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (!authUser || !profile) {
    return null
  }

  const displayName = getUserDisplayName(
    profile.first_name,
    profile.last_name,
    authUser.email,
    authUser.phone
  )
  const identifier = profile.first_name || authUser.email || authUser.phone || 'user'
  const initials = getInitials(
    profile.first_name || authUser.email || authUser.phone || 'user',
    profile.last_name
  )

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          {/* Avatar and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              src={hasGravatar && gravatarUrl ? gravatarUrl : undefined}
              sx={{
                width: 80,
                height: 80,
                bgcolor: getAvatarColor(identifier),
                fontSize: '2rem',
                fontWeight: 600,
                mr: 3,
              }}
            >
              {!hasGravatar && initials}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom>
                {displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Member since{' '}
                {authUser.created_at
                  ? new Date(authUser.created_at).toLocaleDateString()
                  : 'recently'}
              </Typography>
            </Box>
            {!isEditing && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditing(true)}
                sx={{ minWidth: 120 }}
              >
                Edit Profile
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Alert Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Profile Information */}
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>

          {isEditing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
              <TextField
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                variant="outlined"
              />
              {/* Email displayed read-only in edit mode */}
              {authUser.email && (
                <TextField
                  label="Email"
                  type="email"
                  value={authUser.email}
                  fullWidth
                  variant="outlined"
                  disabled
                  helperText="Email changes are not currently supported"
                />
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  First Name
                </Typography>
                <Typography>{profile.first_name || '\u2014'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Last Name
                </Typography>
                <Typography>{profile.last_name || '\u2014'}</Typography>
              </Box>
              {authUser.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Email
                    </Typography>
                    <Typography>{authUser.email}</Typography>
                  </Box>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon fontSize="small" color="action" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Log in using mobile phone
                  </Typography>
                  {authUser.phone ? (
                    <>
                      <Typography>{authUser.phone}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Used for login and notifications
                      </Typography>
                      {/* TODO: Implement phone change via NextAuth API when needed */}
                    </>
                  ) : (
                    <>
                      <Typography color="text.secondary">Not set</Typography>
                      {/* TODO: Implement phone change via NextAuth API when needed */}
                    </>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Activity Stats */}
          <Typography variant="h6" gutterBottom>
            Activity
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 2,
              mb: 4,
            }}
          >
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Favorites
                </Typography>
                <Typography variant="h4">0</Typography>
                <Typography variant="body2" color="text.secondary">
                  Saved resources
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Reviews
                </Typography>
                <Typography variant="h4">0</Typography>
                <Typography variant="body2" color="text.secondary">
                  Written reviews
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {isEditing ? (
              <>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={isSaving}
                  startIcon={<CancelIcon />}
                  sx={{ minWidth: 120 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isSaving}
                  startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                  sx={{ minWidth: 120 }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button variant="outlined" color="error" onClick={signOut} sx={{ minWidth: 120 }}>
                Sign Out
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}
