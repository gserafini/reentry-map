'use client'

import { signIn } from 'next-auth/react'
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export interface SignUpFormProps extends React.ComponentPropsWithoutRef<'div'> {
  onSuccess?: () => void
  minimal?: boolean // When true, removes Card wrapper for use in modals
}

/**
 * Sign up form component using NextAuth.js
 *
 * Flow:
 * 1. User enters email and password
 * 2. Create user via /api/auth/signup
 * 3. Auto sign-in via NextAuth credentials provider
 * 4. Session created on success
 */
export function SignUpFormNextAuth({
  onSuccess,
  minimal = false,
  className,
  ...props
}: SignUpFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // First, create the user account
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const signupData = (await signupResponse.json()) as {
        error?: string
        success?: boolean
      }

      if (!signupResponse.ok) {
        throw new Error(signupData.error || 'Failed to create account')
      }

      // Account created successfully, now sign them in
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Account was created but sign-in failed
        // This shouldn't happen, but handle gracefully
        throw new Error('Account created. Please sign in manually.')
      }

      // Refresh server components to update auth state
      router.refresh()

      if (onSuccess) {
        // Used in modal - stay on current page
        onSuccess()
      } else {
        // Used on standalone page - redirect to profile
        router.push('/profile')
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const formContent = (
    <Box
      component="form"
      onSubmit={handleSignUp}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <TextField
        label="Email"
        type="email"
        placeholder="m@example.com"
        required
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        variant="outlined"
        size={minimal ? 'small' : 'medium'}
      />
      <TextField
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="At least 8 characters"
        required
        fullWidth
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        variant="outlined"
        size={minimal ? 'small' : 'medium'}
        helperText="Minimum 8 characters"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" fullWidth disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </Button>
      {!minimal && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <NextLink href="/auth/login" style={{ textDecoration: 'underline' }}>
            Login
          </NextLink>
        </Typography>
      )}
    </Box>
  )

  if (minimal) {
    return (
      <Box className={className} {...props}>
        {formContent}
      </Box>
    )
  }

  return (
    <Box className={className} {...props}>
      <Card sx={{ maxWidth: 448, width: '100%', p: 2 }}>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            Sign up
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a new account
          </Typography>
          {formContent}
        </CardContent>
      </Card>
    </Box>
  )
}

// Re-export for drop-in replacement
export { SignUpFormNextAuth as SignUpForm }
