'use client'

import { useState, useEffect } from 'react'
import { Snackbar, Button, Box, Typography, IconButton, Paper } from '@mui/material'
import { Close as CloseIcon, GetApp as InstallIcon } from '@mui/icons-material'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA Install Prompt Component
 *
 * Shows a banner prompting users to install the app
 * - Appears after 2 minutes and 2+ visits
 * - Can be dismissed or reminded later (7 days)
 * - Only shows once per session
 * - Respects browser's install criteria
 * - Works on Android Chrome, Edge, Samsung Internet
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if user has permanently dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed === 'permanent') return

    // Check if user clicked "remind later" and it hasn't expired
    const remindLater = localStorage.getItem('pwa-install-remind-later')
    if (remindLater) {
      const remindDate = new Date(remindLater)
      if (remindDate > new Date()) return
    }

    // Check if already shown this session
    const shownThisSession = sessionStorage.getItem('pwa-install-shown')
    if (shownThisSession) return

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Track visit count
    const visitCount = parseInt(localStorage.getItem('pwa-visit-count') || '0', 10)
    localStorage.setItem('pwa-visit-count', String(visitCount + 1))

    // Only show after 2+ visits
    if (visitCount < 1) return

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after 2 minutes (120 seconds)
      setTimeout(() => {
        setShowPrompt(true)
        // Mark as shown this session
        sessionStorage.setItem('pwa-install-shown', 'true')
      }, 120000)
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

  const handleRemindLater = () => {
    setShowPrompt(false)
    // Remind in 7 days
    const remindDate = new Date()
    remindDate.setDate(remindDate.getDate() + 7)
    localStorage.setItem('pwa-install-remind-later', remindDate.toISOString())
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'permanent')
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
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                onClick={handleRemindLater}
                sx={{
                  color: 'primary.contrastText',
                }}
              >
                Remind Later
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={handleDismiss}
                sx={{
                  color: 'primary.contrastText',
                  opacity: 0.8,
                }}
              >
                Don&apos;t Show Again
              </Button>
            </Box>
          </Box>
          <IconButton size="small" onClick={handleDismiss} sx={{ color: 'primary.contrastText' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
    </Snackbar>
  )
}
