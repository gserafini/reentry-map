'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, Tab, Tabs, Box, IconButton } from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { LoginForm } from '@/components/login-form'
import { SignUpForm } from '@/components/sign-up-form'
import { PhoneAuth } from '@/components/auth/PhoneAuth'

export interface AuthModalProps {
  open: boolean
  onClose: () => void
  initialMode?: 'login' | 'signup'
}

/**
 * Authentication modal with login/signup tabs and email/phone options
 *
 * Features:
 * - Login and Sign Up modes
 * - Email/password and Phone/SMS OTP authentication
 * - Material UI tabs for easy switching
 * - Auto-closes on successful authentication
 * - Users stay on current page after auth
 */
export function AuthModal({ open, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')

  // Reset to initial state when modal opens
  const handleClose = () => {
    setMode(initialMode)
    setAuthMethod('email')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {mode === 'login' ? 'Sign In' : 'Sign Up'}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {/* Login / Sign Up Toggle */}
        <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={mode} onChange={(_, value) => setMode(value)} variant="fullWidth">
            <Tab label="Sign In" value="login" />
            <Tab label="Sign Up" value="signup" />
          </Tabs>
        </Box>

        {/* Email / Phone Toggle */}
        <Box sx={{ mb: 2 }}>
          <Tabs
            value={authMethod}
            onChange={(_, value) => setAuthMethod(value)}
            variant="fullWidth"
          >
            <Tab label="Email" value="email" />
            <Tab label="Phone" value="phone" />
          </Tabs>
        </Box>

        {/* Auth Forms */}
        {authMethod === 'phone' ? (
          <PhoneAuth onSuccess={handleClose} />
        ) : mode === 'login' ? (
          <LoginForm onSuccess={handleClose} />
        ) : (
          <SignUpForm onSuccess={handleClose} />
        )}

        {/* Switch Mode Link */}
        <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary', fontSize: '0.875rem' }}>
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <Box
                component="span"
                onClick={() => setMode('signup')}
                sx={{
                  color: 'primary.main',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign up
              </Box>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Box
                component="span"
                onClick={() => setMode('login')}
                sx={{
                  color: 'primary.main',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign in
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}
