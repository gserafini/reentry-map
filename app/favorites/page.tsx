'use client'

import { useEffect, useState } from 'react'
import { Container, Typography, Box, CircularProgress, Alert, Button, Stack } from '@mui/material'
import { useAuth } from '@/lib/hooks/useAuth'
import { useFavorites } from '@/lib/context/FavoritesContext'
import { SavedSupportList } from '@/components/user/SavedSupportList'
import {
  snapshotResource,
  type SavedResource,
  type SavedResourceInput,
} from '@/lib/utils/saved-resources'

export default function FavoritesPage() {
  const { user, isAuthenticated } = useAuth()
  const {
    savedResources,
    removeDeviceFavorite,
    clearDeviceFavorites,
    error: deviceError,
    favoriteIds,
    toggleFavorite,
  } = useFavorites()
  const [accountResources, setAccountResources] = useState<SavedResource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    let active = true
    setLoading(true)
    fetch('/api/favorites')
      .then(async (response) => {
        if (!response.ok) throw new Error('Account favorites unavailable')
        const result = (await response.json()) as {
          data?: { resource_id: string; resource: SavedResourceInput; created_at: string }[]
        }
        if (active)
          setAccountResources(
            (result.data || [])
              .filter((favorite) => favorite.resource)
              .map((favorite) =>
                snapshotResource(favorite.resource_id, favorite.resource, favorite.created_at)
              )
          )
      })
      .catch(() => {
        if (active)
          setError('Your account list could not load. Device copies below remain available.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isAuthenticated, user?.id])

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Saved resources
      </Typography>
      <Typography sx={{ mb: 2 }}>
        Keep phone numbers and next steps together for when you need them.
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Device saves stay in this browser. They are not uploaded, publicly shared, or automatically
        added to an account. On a shared phone, clear your list when finished. Downloads remain
        until you delete them.
      </Alert>
      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{ mb: 3 }} data-print-hide>
        <Button href="/resources">Find more help</Button>
        <Button href="/offline.html">Open offline contact page</Button>
      </Stack>
      {deviceError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {deviceError}
        </Alert>
      )}
      <Typography variant="h5" component="h2" gutterBottom>
        On this device ({savedResources.length})
      </Typography>
      <SavedSupportList
        resources={savedResources}
        onRemove={removeDeviceFavorite}
        onClear={clearDeviceFavorites}
      />
      {isAuthenticated && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            In your account
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Account favorites are separate and need an internet connection.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {loading ? (
            <CircularProgress aria-label="Loading account favorites" />
          ) : (
            !error && (
              <SavedSupportList
                resources={accountResources.filter((resource) => favoriteIds.has(resource.id))}
                onRemove={(id) => {
                  void toggleFavorite(id)
                }}
              />
            )
          )}
        </Box>
      )}
      {!isAuthenticated && (
        <Box sx={{ mt: 3 }} data-print-hide>
          <Typography variant="body2" color="text.secondary">
            Already have account favorites?
          </Typography>
          <Button href="/auth/login?redirect=/favorites">Sign in to view your account list</Button>
        </Box>
      )}
    </Container>
  )
}
