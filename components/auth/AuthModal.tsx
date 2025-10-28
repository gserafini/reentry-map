'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, Box, IconButton, Divider } from '@mui/material'
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
 * Simple authentication modal with phone and email options stacked
 *
 * Features:
 * - Both phone and email auth visible (no tabs)
 * - Clean vertical layout with OR divider
 * - Switch between login/signup via bottom link
 * - Auto-closes on successful authentication
 * - Users stay on current page after auth
 */
export function AuthModal({ open, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)

  // Reset to initial state when modal closes
  const handleClose = () => {
    setMode(initialMode)
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
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
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
      <DialogContent sx={{ pt: 0 }}>
        {/* Phone Auth */}
        <PhoneAuth onSuccess={handleClose} />

        {/* OR Divider */}
        <Box sx={{ my: 3, position: 'relative' }}>
          <Divider sx={{ borderColor: 'divider' }} />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'background.paper',
              px: 2,
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            OR
          </Box>
        </Box>

        {/* Email Auth */}
        {mode === 'login' ? (
          <LoginForm onSuccess={handleClose} />
        ) : (
          <SignUpForm onSuccess={handleClose} />
        )}

        {/* Switch Mode Link */}
        <Box sx={{ mt: 3, textAlign: 'center', color: 'text.secondary', fontSize: '0.875rem' }}>
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <Box
                component="span"
                onClick={() => setMode('signup')}
                sx={{
                  color: 'primary.main',
                  cursor: 'pointer',
                  fontWeight: 500,
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
                  fontWeight: 500,
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
