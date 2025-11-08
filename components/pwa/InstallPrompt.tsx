'use client'

import { useState, useEffect } from 'react'
import {
  Snackbar,
  Button,
  Box,
  Typography,
  IconButton,
  Paper,
} from '@mui/material'
import {
  Close as CloseIcon,
  GetApp as InstallIcon,
} from '@mui/icons-material'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA Install Prompt Component
 *
 * Shows a banner prompting users to install the app
 * - Appears after 30 seconds on first visit
 * - Can be dismissed permanently
 * - Respects browser's install criteria
 * - Works on Android Chrome, Edge, Samsung Internet
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) return

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after 30 seconds
      setTimeout(() => {
        setShowPrompt(true)
      }, 30000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <Snackbar
      open={showPrompt}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 80, md: 24 } }} // Account for mobile bottom nav
    >
      <Paper
        elevation={6}
        sx={{
          p: 2,
          maxWidth: 400,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <InstallIcon sx={{ fontSize: 40, flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Install Reentry Map
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Install the app for quick access and offline use
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleInstall}
                sx={{
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'background.default',
                  },
                }}
              >
                Install
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={handleDismiss}
                sx={{
                  color: 'primary.contrastText',
                }}
              >
                Not Now
              </Button>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{ color: 'primary.contrastText' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
    </Snackbar>
  )
}
