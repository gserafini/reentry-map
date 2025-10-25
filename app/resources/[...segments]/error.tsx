'use client'

import { Container, Alert, Typography, Button, Box } from '@mui/material'
import { useEffect } from 'react'

/**
 * Error boundary for Resource Detail Page
 * Handles errors that occur during rendering or data fetching
 */
export default function ResourceDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Resource detail page error:', error)
  }, [error])

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Alert
        severity="error"
        sx={{
          textAlign: 'center',
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        <Typography variant="h6" gutterBottom>
          Error Loading Resource
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {error.message || 'An unexpected error occurred while loading this resource.'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={() => reset()}>
            Try Again
          </Button>
          <Button variant="contained" href="/resources">
            Back to Resources
          </Button>
        </Box>
      </Alert>
    </Container>
  )
}
