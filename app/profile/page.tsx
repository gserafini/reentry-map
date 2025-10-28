'use client'

import { useEffect, useState } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/types/database'

export default function ProfilePage() {
  const { user: authUser, isLoading: authLoading, isAuthenticated, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<User | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  const [showGravatar, setShowGravatar] = useState(true)
  const { gravatarUrl } = useGravatar(authUser?.email, 160)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch user profile from public.users table
  useEffect(() => {
    async function fetchProfile() {
      if (!authUser) {
        setIsLoadingProfile(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error) throw error

        setProfile(data)
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
        setEmail(authUser.email || '')
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile')
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [authUser, supabase])

  const handleSave = async () => {
    if (!authUser || !profile) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Update profile in public.users table
      const { error: profileError } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        })
        .eq('id', authUser.id)

      if (profileError) throw profileError

      // Update email in auth.users if changed
      if (email !== authUser.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim(),
        })

        if (emailError) throw emailError
        setSuccess('Profile updated! Check your email to confirm the new address.')
      } else {
        setSuccess('Profile updated successfully!')
      }

      // Refresh profile data
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()

      if (data) setProfile(data)
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
    setEmail(authUser?.email || '')
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
              src={showGravatar && gravatarUrl ? gravatarUrl : undefined}
              imgProps={{
                onError: () => setShowGravatar(false),
              }}
              sx={{
                width: 80,
                height: 80,
                bgcolor: getAvatarColor(identifier),
                fontSize: '2rem',
                fontWeight: 600,
                mr: 3,
              }}
            >
              {(!showGravatar || !gravatarUrl) && initials}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom>
                {displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Member since {new Date(authUser.created_at).toLocaleDateString()}
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
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                variant="outlined"
                helperText={
                  email !== authUser.email
                    ? 'Changing your email will require verification'
                    : undefined
                }
              />
              {authUser.phone && (
                <TextField
                  label="Phone"
                  value={authUser.phone}
                  disabled
                  fullWidth
                  variant="outlined"
                  helperText="Phone number cannot be changed"
                />
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  First Name
                </Typography>
                <Typography>{profile.first_name || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Last Name
                </Typography>
                <Typography>{profile.last_name || '—'}</Typography>
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
              {authUser.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Phone
                    </Typography>
                    <Typography>{authUser.phone}</Typography>
                  </Box>
                </Box>
              )}
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
