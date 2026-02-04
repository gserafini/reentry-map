'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Typography, Box, Grid, CircularProgress, Alert, Button } from '@mui/material'
import { FavoriteBorder as FavoriteBorderIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { ResourceCard } from '@/components/resources/ResourceCard'
import type { Database } from '@/lib/types/database'

type ResourceWithFavorite = {
  id: string
  user_id: string
  resource_id: string
  notes: string | null
  created_at: string
  resource: Database['public']['Tables']['resources']['Row']
}

export default function FavoritesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [favorites, setFavorites] = useState<ResourceWithFavorite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/favorites')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch favorites
  useEffect(() => {
    async function fetchFavorites() {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/favorites')
        const result = (await response.json()) as { data?: ResourceWithFavorite[]; error?: string }

        if (!response.ok) {
          setError('Failed to load favorites. Please try again.')
          console.error(result.error)
        } else {
          setFavorites(result.data || [])
        }
      } catch (fetchError) {
        setError('Failed to load favorites. Please try again.')
        console.error(fetchError)
      }

      setLoading(false)
    }

    if (user) {
      fetchFavorites()
    }
  }, [user])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Favorites
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Resources you&apos;ve saved for quick access
        </Typography>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && !error && favorites.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
          }}
        >
          <FavoriteBorderIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No favorites yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Start exploring resources and save your favorites for easy access
          </Typography>
          <Button variant="contained" onClick={() => router.push('/resources')}>
            Browse Resources
          </Button>
        </Box>
      )}

      {/* Favorites Grid */}
      {!loading && !error && favorites.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {favorites.length} {favorites.length === 1 ? 'resource' : 'resources'} saved
          </Typography>
          <Grid container spacing={3}>
            {favorites.map((fav) => (
              <Grid key={fav.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <ResourceCard resource={fav.resource} />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Container>
  )
}
