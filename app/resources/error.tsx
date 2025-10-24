'use client'

import { Container, Alert, AlertTitle, Button, Box } from '@mui/material'

/**
 * Error boundary for Resources page
 * Displayed when an error occurs during rendering
 */
export default function ResourcesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Alert severity="error" sx={{ textAlign: 'center' }}>
        <AlertTitle>Something went wrong!</AlertTitle>
        <Box sx={{ mb: 2 }}>
          {error.message || 'An unexpected error occurred while loading resources.'}
        </Box>
        <Button onClick={reset} variant="contained" color="error">
          Try again
        </Button>
      </Alert>
    </Container>
  )
}
