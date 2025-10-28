'use client'

import { createClient } from '@/lib/supabase/client'
import { Box, Button, Card, CardContent, TextField, Typography, Alert } from '@mui/material'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export interface SignUpFormProps extends React.ComponentPropsWithoutRef<'div'> {
  onSuccess?: () => void
  minimal?: boolean // When true, removes Card wrapper for use in modals
}

export function SignUpForm({ onSuccess, minimal = false, className, ...props }: SignUpFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      })
      if (error) throw error
      // Refresh server components to update auth state in header
      router.refresh()

      if (onSuccess) {
        // Used in modal - stay on current page
        onSuccess()
      } else {
        // Used on standalone page - redirect to success page
        router.push('/auth/sign-up-success')
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
        type="password"
        placeholder="Enter your password"
        required
        fullWidth
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        variant="outlined"
        size={minimal ? 'small' : 'medium'}
      />
      <TextField
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        required
        fullWidth
        value={repeatPassword}
        onChange={(e) => setRepeatPassword(e.target.value)}
        variant="outlined"
        size={minimal ? 'small' : 'medium'}
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
