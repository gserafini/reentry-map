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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from '@mui/material'
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhoneAndroid as PhoneAndroidIcon,
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

  // Phone change dialog state
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [isPhoneLoading, setIsPhoneLoading] = useState(false)
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0)

  const { gravatarUrl, hasGravatar } = useGravatar(authUser?.email, 160)

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

        // If profile doesn't exist, create it
        if (error?.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert({ id: authUser.id, phone: authUser.phone })
            .select()
            .single()

          if (insertError) {
            console.error('Error creating profile:', insertError)
            throw new Error(`Failed to create profile: ${insertError.message || 'Unknown error'}`)
          }

          setProfile(newProfile)
          setFirstName(newProfile.first_name || '')
          setLastName(newProfile.last_name || '')
          setEmail(authUser.email || '')
        } else if (error) {
          console.error('Profile fetch error:', error)
          throw new Error(`Failed to fetch profile: ${error.message || JSON.stringify(error)}`)
        } else {
          setProfile(data)
          setFirstName(data.first_name || '')
          setLastName(data.last_name || '')
          setEmail(authUser.email || '')
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null
              ? JSON.stringify(err)
              : 'Unknown error'
        console.error('Detailed error:', errorMessage)
        setError(`Failed to load profile: ${errorMessage}`)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [authUser, supabase])

  // Phone resend cooldown timer
  useEffect(() => {
    if (phoneResendCooldown > 0) {
      const timer = setTimeout(() => setPhoneResendCooldown(phoneResendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [phoneResendCooldown])

  // Phone formatting helpers
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    if (digits.startsWith('1')) {
      return `+${digits}`
    }
    return `+1${digits}`
  }

  const formatPhoneDisplay = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneDisplay(e.target.value)
    setNewPhone(formatted)
  }

  // Open phone change dialog
  const handleOpenPhoneDialog = () => {
    setIsPhoneDialogOpen(true)
    setNewPhone('')
    setPhoneOtp('')
    setPhoneStep('phone')
    setPhoneError(null)
  }

  // Close phone change dialog
  const handleClosePhoneDialog = () => {
    setIsPhoneDialogOpen(false)
    setNewPhone('')
    setPhoneOtp('')
    setPhoneStep('phone')
    setPhoneError(null)
    setPhoneResendCooldown(0)
  }

  // Send OTP to new phone number
  const handleSendPhoneOTP = async () => {
    setIsPhoneLoading(true)
    setPhoneError(null)

    try {
      const formattedPhone = formatPhoneNumber(newPhone)
      const digits = newPhone.replace(/\D/g, '')

      if (digits.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number')
      }

      const { error } = await supabase.auth.updateUser({
        phone: formattedPhone,
      })

      if (error) throw error

      setPhoneStep('otp')
      setPhoneResendCooldown(60)
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setIsPhoneLoading(false)
    }
  }

  // Verify OTP and update phone
  const handleVerifyPhoneOTP = async (code?: string) => {
    setIsPhoneLoading(true)
    setPhoneError(null)

    const otpCode = code || phoneOtp

    try {
      const formattedPhone = formatPhoneNumber(newPhone)

      if (otpCode.length !== 6) {
        throw new Error('Please enter the 6-digit verification code')
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: 'phone_change',
      })

      if (error) throw error

      // Refresh auth state
      router.refresh()
      setSuccess('Phone number updated successfully!')
      handleClosePhoneDialog()
    } catch (err) {
      setPhoneError(
        err instanceof Error ? err.message : 'Invalid verification code. Please try again.'
      )
    } finally {
      setIsPhoneLoading(false)
    }
  }

  // Resend OTP
  const handleResendPhoneOTP = async () => {
    if (phoneResendCooldown > 0) return

    setIsPhoneLoading(true)
    setPhoneError(null)

    try {
      const formattedPhone = formatPhoneNumber(newPhone)

      const { error } = await supabase.auth.updateUser({
        phone: formattedPhone,
      })

      if (error) throw error

      setPhoneResendCooldown(60)
      setPhoneOtp('')
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to resend verification code')
    } finally {
      setIsPhoneLoading(false)
    }
  }

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
                        Used for login and notifications •{' '}
                        <Link
                          component="button"
                          variant="caption"
                          onClick={handleOpenPhoneDialog}
                          sx={{ cursor: 'pointer' }}
                        >
                          Change
                        </Link>
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography color="text.secondary">Not set</Typography>
                      <Typography variant="caption" color="text.secondary">
                        <Link
                          component="button"
                          variant="caption"
                          onClick={handleOpenPhoneDialog}
                          sx={{ cursor: 'pointer' }}
                        >
                          Add mobile phone
                        </Link>{' '}
                        to enable phone login
                      </Typography>
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

      {/* Phone Change Dialog */}
      <Dialog open={isPhoneDialogOpen} onClose={handleClosePhoneDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneAndroidIcon />
            <Typography variant="h6">
              {authUser?.phone ? 'Change Phone Number' : 'Add Phone Number'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {phoneStep === 'phone' ? (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {authUser?.phone
                  ? "Enter your new mobile phone number. We'll send you a verification code via SMS."
                  : "Enter your mobile phone number to enable phone login. We'll send you a verification code via SMS."}
              </Typography>
              <TextField
                label={authUser?.phone ? 'New Mobile Phone Number' : 'Mobile Phone Number'}
                type="tel"
                placeholder="(555) 123-4567"
                required
                fullWidth
                value={newPhone}
                onChange={handlePhoneChange}
                variant="outlined"
                helperText="US mobile numbers only - for SMS verification"
                inputProps={{
                  maxLength: 14,
                  autoComplete: 'tel',
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Carrier charges may apply
              </Typography>
              {phoneError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {phoneError}
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                We sent a 6-digit code to {newPhone}
              </Typography>
              <TextField
                label="Verification Code"
                type="text"
                placeholder="123456"
                required
                fullWidth
                value={phoneOtp}
                onChange={(e) => {
                  const code = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setPhoneOtp(code)
                  // Auto-submit when 6 digits entered
                  if (code.length === 6 && !isPhoneLoading) {
                    handleVerifyPhoneOTP(code)
                  }
                }}
                variant="outlined"
                helperText="Code will auto-submit when complete"
                inputProps={{
                  maxLength: 6,
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                }}
                autoComplete="one-time-code"
              />
              {phoneError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {phoneError}
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', mt: 2 }}>
                <Button
                  variant="text"
                  onClick={handleResendPhoneOTP}
                  disabled={phoneResendCooldown > 0 || isPhoneLoading}
                  size="small"
                >
                  {phoneResendCooldown > 0 ? `Resend in ${phoneResendCooldown}s` : 'Resend code'}
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    setPhoneStep('phone')
                    setPhoneOtp('')
                    setPhoneError(null)
                  }}
                  size="small"
                >
                  Change phone number
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePhoneDialog} disabled={isPhoneLoading}>
            Cancel
          </Button>
          {phoneStep === 'phone' ? (
            <Button
              variant="contained"
              onClick={handleSendPhoneOTP}
              disabled={isPhoneLoading || newPhone.replace(/\D/g, '').length !== 10}
            >
              {isPhoneLoading ? 'Sending...' : 'Send Code'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => handleVerifyPhoneOTP()}
              disabled={isPhoneLoading || phoneOtp.length !== 6}
            >
              {isPhoneLoading ? 'Verifying...' : 'Verify'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  )
}
