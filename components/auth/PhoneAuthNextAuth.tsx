'use client'

import { signIn } from 'next-auth/react'
import { Alert, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type AuthStep = 'phone' | 'otp'

export interface PhoneAuthProps extends React.ComponentPropsWithoutRef<'div'> {
  onSuccess?: () => void
  mode?: 'login' | 'signup' // Determines button text
  minimal?: boolean // When true, removes Card wrapper for use in modals
}

/**
 * Phone authentication component using NextAuth.js with Twilio SMS OTP
 *
 * Flow:
 * 1. User enters phone number (US format)
 * 2. Call /api/auth/otp/send to send SMS (via Twilio)
 * 3. User enters 6-digit code
 * 4. Call NextAuth signIn with phone-otp provider
 * 5. Session created on success
 */
export function PhoneAuthNextAuth({
  onSuccess,
  mode = 'login',
  minimal = false,
  className,
  ...props
}: PhoneAuthProps) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<AuthStep>('phone')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [devCode, setDevCode] = useState<string | null>(null) // For development mode
  const router = useRouter()

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  /**
   * Format phone number to E.164 format (+1XXXXXXXXXX)
   */
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    if (digits.startsWith('1')) {
      return `+${digits}`
    }
    return `+1${digits}`
  }

  /**
   * Format phone number for display (XXX) XXX-XXXX
   */
  const formatPhoneDisplay = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  /**
   * Handle phone number change with auto-formatting
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneDisplay(e.target.value)
    setPhone(formatted)
  }

  /**
   * Send OTP to phone number via /api/auth/otp/send
   */
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setDevCode(null)

    try {
      const formattedPhone = formatPhoneNumber(phone)

      // Validate phone number (must be 10 digits for US)
      const digits = phone.replace(/\D/g, '')
      if (digits.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number')
      }

      // Call our OTP send API
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      })

      const data = (await response.json()) as { error?: string; devCode?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code')
      }

      // In development mode, show the code
      if (data.devCode) {
        setDevCode(data.devCode)
      }

      setStep('otp')
      setResendCooldown(60)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Verify OTP code via NextAuth
   */
  const handleVerifyOTP = async (e?: React.FormEvent, code?: string) => {
    e?.preventDefault()
    setIsLoading(true)
    setError(null)

    const otpCode = code || otp

    try {
      const formattedPhone = formatPhoneNumber(phone)

      // Validate OTP (must be 6 digits)
      if (otpCode.length !== 6) {
        throw new Error('Please enter the 6-digit verification code')
      }

      // Sign in via NextAuth phone-otp provider
      const result = await signIn('phone-otp', {
        phone: formattedPhone,
        code: otpCode,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(result.error === 'CredentialsSignin'
          ? 'Invalid verification code. Please try again.'
          : result.error)
      }

      // Refresh server components to update auth state in header
      router.refresh()

      if (onSuccess) {
        // Used in modal - stay on current page
        onSuccess()
      } else {
        // Used on standalone page - redirect to home
        router.push('/')
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : 'Invalid verification code. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Resend OTP code
   */
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return

    setIsLoading(true)
    setError(null)
    setDevCode(null)

    try {
      const formattedPhone = formatPhoneNumber(phone)

      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      })

      const data = (await response.json()) as { error?: string; devCode?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code')
      }

      if (data.devCode) {
        setDevCode(data.devCode)
      }

      setResendCooldown(60)
      setOtp('')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to resend verification code')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Go back to phone number entry
   */
  const handleBackToPhone = () => {
    setStep('phone')
    setOtp('')
    setError(null)
    setDevCode(null)
  }

  const content = (
    <>
      {step === 'phone' ? (
        <>
          {!minimal && (
            <>
              <Typography variant="h4" component="h1" gutterBottom>
                {mode === 'login' ? 'Log In' : 'Sign Up'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Enter your phone number to receive a verification code
              </Typography>
            </>
          )}
          <Box
            component="form"
            onSubmit={handleSendOTP}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label={
                mode === 'login' ? 'Log in with my mobile phone' : 'Sign up with my mobile phone'
              }
              type="tel"
              placeholder="(555) 123-4567"
              required
              fullWidth
              value={phone}
              onChange={handlePhoneChange}
              variant="outlined"
              size={minimal ? 'small' : 'medium'}
              helperText="US mobile numbers only - for SMS verification"
              inputProps={{
                maxLength: 14,
                autoComplete: 'tel',
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
              Carrier charges may apply
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" fullWidth disabled={isLoading}>
              {isLoading ? 'Sending code...' : 'Send verification code'}
            </Button>
          </Box>
        </>
      ) : (
        <>
          <Typography variant="h4" component="h1" gutterBottom>
            Enter Verification Code
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            We sent a 6-digit code to {phone}
          </Typography>
          {devCode && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Development mode: Your code is <strong>{devCode}</strong>
            </Alert>
          )}
          <Box
            component="form"
            onSubmit={handleVerifyOTP}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Verification Code"
              type="text"
              placeholder="123456"
              required
              fullWidth
              value={otp}
              onChange={(e) => {
                const code = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(code)
                // Auto-submit when 6 digits entered
                if (code.length === 6 && !isLoading) {
                  handleVerifyOTP(undefined, code)
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
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" fullWidth disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify and log in'}
            </Button>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
              <Button
                variant="text"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || isLoading}
                size="small"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </Button>
              <Button variant="text" onClick={handleBackToPhone} size="small">
                Change phone number
              </Button>
            </Box>
          </Box>
        </>
      )}
    </>
  )

  if (minimal) {
    return (
      <Box className={className} {...props}>
        {content}
      </Box>
    )
  }

  return (
    <Box className={className} {...props}>
      <Card sx={{ maxWidth: 448, width: '100%', p: 2 }}>
        <CardContent>{content}</CardContent>
      </Card>
    </Box>
  )
}

// Re-export for drop-in replacement
export { PhoneAuthNextAuth as PhoneAuth }
