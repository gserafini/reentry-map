'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  IconButton,
  Divider,
  Alert,
  AlertTitle,
  Link as MuiLink,
} from '@mui/material'
import { Close as CloseIcon, Settings as SettingsIcon } from '@mui/icons-material'
import { LoginForm } from '@/components/login-form'
import { SignUpForm } from '@/components/sign-up-form'
import { PhoneAuth } from '@/components/auth/PhoneAuth'
import { getFeatureFlags } from '@/lib/api/settings-client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { FeatureFlags } from '@/lib/types/settings'

export interface AuthModalProps {
  open: boolean
  onClose: () => void
  initialMode?: 'login' | 'signup'
}

/**
 * Simple authentication modal with phone and email options stacked
 *
 * Features:
 * - Email auth always visible
 * - Phone/SMS auth conditionally shown based on feature flag
 * - Admin alert to configure SMS if not enabled
 * - Clean vertical layout with OR divider
 * - Switch between login/signup via bottom link
 * - Auto-closes on successful authentication
 * - Users stay on current page after auth
 */
export function AuthModal({ open, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null)
  const { user } = useAuth()

  // Sync mode with initialMode when it changes (fixes bug where mode doesn't update)
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  // Fetch feature flags on mount
  useEffect(() => {
    async function loadFeatureFlags() {
      const flags = await getFeatureFlags()
      setFeatureFlags(flags)
    }
    loadFeatureFlags()
  }, [])

  // Simply close the modal without resetting state
  // State will be synced via useEffect when modal reopens
  const handleClose = () => {
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
          borderRadius: 3,
          maxWidth: 480,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          pt: 3,
          pb: 1,
        }}
      >
        <Box>
          <Box component="h2" sx={{ fontSize: '1.5rem', fontWeight: 600, m: 0, mb: 0.5 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </Box>
          <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', fontWeight: 400 }}>
            {mode === 'login'
              ? 'Log in to your account to continue'
              : 'Sign up to save favorites and reviews'}
          </Box>
        </Box>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 2, pb: 3 }}>
        {/* Admin Alert: SMS Not Configured */}
        {Boolean((user as unknown as Record<string, unknown>)?.is_admin) &&
          !featureFlags?.smsAuth && (
            <Alert severity="info" icon={<SettingsIcon />} sx={{ mb: 3 }}>
              <AlertTitle>SMS Auth Disabled</AlertTitle>
              Phone authentication is currently disabled.{' '}
              <MuiLink href="/admin/settings" sx={{ fontWeight: 600 }}>
                Configure SMS provider
              </MuiLink>{' '}
              to enable.
            </Alert>
          )}

        {/* Phone Auth Section - Only show if SMS enabled */}
        {featureFlags?.smsAuth && featureFlags?.smsProviderConfigured && (
          <>
            <Box sx={{ mb: 3 }}>
              <PhoneAuth onSuccess={handleClose} mode={mode} minimal />
            </Box>

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
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                }}
              >
                OR
              </Box>
            </Box>
          </>
        )}

        {/* Email Auth Section - Always visible */}
        <Box sx={{ mb: 2 }}>
          {mode === 'login' ? (
            <LoginForm onSuccess={handleClose} minimal />
          ) : (
            <SignUpForm onSuccess={handleClose} minimal />
          )}
        </Box>

        {/* Switch Mode Link */}
        <Box sx={{ mt: 3, textAlign: 'center', fontSize: '0.875rem' }}>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          </Box>
          <Box
            component="span"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              fontWeight: 600,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
