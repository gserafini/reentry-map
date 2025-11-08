import { Container, Typography, Box, Button } from '@mui/material'
import { WifiOff as OfflineIcon } from '@mui/icons-material'

/**
 * Offline fallback page
 *
 * Shown when user is offline and tries to navigate to an uncached page
 */
export default function OfflinePage() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <OfflineIcon sx={{ fontSize: 80, color: 'text.secondary' }} />

        <Typography variant="h4" component="h1" gutterBottom>
          You're Offline
        </Typography>

        <Typography variant="body1" color="text.secondary">
          It looks like you've lost your internet connection. Some features may not be available
          until you're back online.
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Pages you've visited previously should still be accessible.
        </Typography>

        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Try Again
        </Button>
      </Box>
    </Container>
  )
}
