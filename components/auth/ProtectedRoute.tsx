'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '@/lib/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

/**
 * ProtectedRoute component
 *
 * Wraps pages that require authentication. Redirects to login if not authenticated.
 * Shows loading state while checking auth status.
 *
 * @param children - Child components to render if authenticated
 * @param requireAuth - Whether authentication is required (default: true)
 * @param redirectTo - Where to redirect if not authenticated (default: '/login')
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && requireAuth && !user) {
      // Store the intended destination to redirect back after login
      const currentPath = window.location.pathname
      if (currentPath !== redirectTo) {
        sessionStorage.setItem('redirectAfterLogin', currentPath)
      }
      router.push(redirectTo)
    }
  }, [user, isLoading, requireAuth, redirectTo, router])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    )
  }

  // If auth is required and user is not authenticated, show nothing
  // (redirect happens in useEffect)
  if (requireAuth && !user) {
    return null
  }

  // User is authenticated (or auth not required), render children
  return <>{children}</>
}
