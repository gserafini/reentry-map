'use client'

import { createClient } from '@/lib/supabase/client'
import { Box, Button, Card, CardContent, TextField, Typography, Alert } from '@mui/material'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  onSuccess?: () => void
  minimal?: boolean // When true, removes Card wrapper for use in modals
}

export function LoginForm({ onSuccess, minimal = false, className, ...props }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
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
        {!minimal && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography variant="body2">Password</Typography>
            <NextLink
              href="/auth/forgot-password"
              style={{ fontSize: '0.875rem', textDecoration: 'underline' }}
            >
              Forgot password?
            </NextLink>
          </Box>
        )}
        <TextField
          label={minimal ? 'Password' : undefined}
          type="password"
          placeholder="Enter your password"
          required
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          variant="outlined"
          size={minimal ? 'small' : 'medium'}
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
            Enter your email below to login to your account
          </Typography>
          {formContent}
        </CardContent>
      </Card>
    </Box>
  )
}
