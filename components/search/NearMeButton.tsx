'use client'

import { Button, CircularProgress, Snackbar, Alert } from '@mui/material'
import { MyLocation as MyLocationIcon } from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useUserLocation } from '@/lib/context/LocationContext'
import { getLocationErrorMessage } from '@/lib/hooks/useLocation'

/**
 * Button that requests user's location and sorts results by distance
 */
export function NearMeButton() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { requestLocation, loading, error, coordinates } = useUserLocation()
  const [showError, setShowError] = useState(false)
  const [hasRequested, setHasRequested] = useState(false)

  const handleNearMe = () => {
    // If we already have coordinates, just update sort immediately
    if (coordinates) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('sort', 'distance-asc')
      router.push(`${pathname}?${params.toString()}`)
      return
    }

    // Otherwise request location
    setHasRequested(true)
    requestLocation()
  }

  // When location is received or error occurs, handle it
  useEffect(() => {
    if (!hasRequested) return

    if (error) {
      setShowError(true)
      setHasRequested(false)
    } else if (coordinates && !loading) {
      // Location was just received, update URL to sort by distance
      const params = new URLSearchParams(searchParams.toString())
      params.set('sort', 'distance-asc')
      router.push(`${pathname}?${params.toString()}`)
      setHasRequested(false)
    }
  }, [coordinates, error, loading, hasRequested, searchParams, router, pathname])

  const handleCloseError = () => {
    setShowError(false)
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MyLocationIcon />}
        onClick={handleNearMe}
        disabled={loading}
        sx={{
          whiteSpace: 'nowrap',
          minWidth: 'auto',
        }}
      >
        {loading ? 'Getting location...' : 'Near Me'}
      </Button>

      {/* Error Snackbar */}
      <Snackbar
        open={showError && !!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error ? getLocationErrorMessage(error) : ''}
        </Alert>
      </Snackbar>
    </>
  )
}
