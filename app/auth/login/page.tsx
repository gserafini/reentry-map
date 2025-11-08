'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container, Box, Typography } from '@mui/material'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuth } from '@/lib/hooks/useAuth'

export default function LoginPage() {
  const [modalOpen, setModalOpen] = useState(true)
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // If user is already authenticated, redirect them
    if (!isLoading && isAuthenticated) {
      // Check if there's a redirect parameter
      const redirect = searchParams.get('redirect') || sessionStorage.getItem('redirectAfterLogin')

      // Clear the redirect from sessionStorage
      sessionStorage.removeItem('redirectAfterLogin')

      // Redirect to the intended page or home
      router.push(redirect || '/')
    }
  }, [isAuthenticated, isLoading, router, searchParams])

  const handleClose = () => {
    setModalOpen(false)
    // Go back or to home if user closes the modal
    router.back()
  }

  // Don't show anything while loading or if already authenticated
  if (isLoading || isAuthenticated) {
    return null
  }

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Sign In
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please sign in to continue
          </Typography>
        </Box>
      </Container>
      <AuthModal open={modalOpen} onClose={handleClose} initialMode="login" />
    </>
  )
}
