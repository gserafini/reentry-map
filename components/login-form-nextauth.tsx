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

export interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  onSuccess?: () => void
  minimal?: boolean // When true, removes Card wrapper for use in modals
}

/**
 * Login form component using NextAuth.js credentials provider
 *
 * Supports email/password authentication against self-hosted PostgreSQL
 */
export function LoginFormNextAuth({
  onSuccess,
  minimal = false,
  className,
  ...props
}: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Sign in via NextAuth credentials provider
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(
          result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error
        )
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
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const formContent = (
    <Box
      component="form"
      onSubmit={handleLogin}
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
      <Box>
        <TextField
          label={minimal ? 'Password' : undefined}
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          required
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          variant="outlined"
          size={minimal ? 'small' : 'medium'}
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
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" fullWidth disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
      {!minimal && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <NextLink href="/auth/sign-up" style={{ textDecoration: 'underline' }}>
            Sign up
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
            Login
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your email below to log in to your account
          </Typography>
          {formContent}
        </CardContent>
      </Card>
    </Box>
  )
}

// Re-export for drop-in replacement
export { LoginFormNextAuth as LoginForm }
