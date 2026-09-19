'use client'

import { useEffect, useState } from 'react'
import { Alert, Container, Typography, Box, Button, Stack } from '@mui/material'
import { WifiOff } from '@mui/icons-material'
import { useFavorites } from '@/lib/context/FavoritesContext'
import { SavedSupportList } from '@/components/user/SavedSupportList'

export default function OfflinePage() {
  const { savedResources, removeDeviceFavorite, clearDeviceFavorites, error } = useFavorites()
  const [online, setOnline] = useState(false)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <WifiOff />
        <Typography variant="h4" component="h1">
          Keep your next steps close
        </Typography>
      </Box>
      <Alert severity={online ? 'info' : 'warning'} sx={{ mb: 2 }}>
        {online
          ? 'Your connection is available. Try opening the online list again.'
          : 'You are offline. Saved contacts on this device are available below.'}
      </Alert>
      <Typography sx={{ mb: 2 }}>
        Saved copies may be out of date. Confirm intake, hours and availability before visiting.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }} data-print-hide>
        <Button variant="contained" href="/favorites">
          Try online list
        </Button>
        <Button variant="outlined" href="/offline.html">
          Offline contact page
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <SavedSupportList
        resources={savedResources}
        onRemove={removeDeviceFavorite}
        onClear={clearDeviceFavorites}
      />
    </Container>
  )
}
