'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material'
import { Lightbulb as LightbulbIcon, Add as AddIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { getUserSuggestions } from '@/lib/api/suggestions'
import type { Database } from '@/lib/types/database'

type ResourceSuggestion = Database['public']['Tables']['resource_suggestions']['Row']

export default function MySuggestionsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<ResourceSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/my-suggestions')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch user suggestions
  useEffect(() => {
    async function fetchSuggestions() {
      if (!user) return

      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getUserSuggestions(user.id)

      if (fetchError) {
        setError('Failed to load suggestions. Please try again.')
      } else {
        setSuggestions(data || [])
      }

      setLoading(false)
    }

    if (user) {
      fetchSuggestions()
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

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success'
      case 'rejected':
        return 'error'
      case 'duplicate':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Suggestions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track the status of your submitted resource suggestions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/suggest-resource')}
        >
          Suggest Resource
        </Button>
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
      {!loading && !error && suggestions.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
          <LightbulbIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No suggestions yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Know a resource that should be listed? Share it with the community!
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/suggest-resource')}
          >
            Suggest a Resource
          </Button>
        </Box>
      )}

      {/* Suggestions List */}
      {!loading && !error && suggestions.length > 0 && (
        <Stack spacing={2}>
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {suggestion.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip label={suggestion.category} size="small" />
                      <Chip
                        label={getStatusLabel(suggestion.status || 'pending')}
                        size="small"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        color={getStatusColor(suggestion.status || 'pending') as any}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Submitted:{' '}
                      {suggestion.created_at
                        ? new Date(suggestion.created_at).toLocaleDateString()
                        : 'Unknown'}
                      {suggestion.reviewed_at &&
                        ` • Reviewed: ${new Date(suggestion.reviewed_at).toLocaleDateString()}`}
                    </Typography>
                  </Box>
                </Box>

                {suggestion.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {suggestion.description}
                  </Typography>
                )}

                {suggestion.address && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Address:</strong> {suggestion.address}
                  </Typography>
                )}

                {suggestion.phone && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Phone:</strong> {suggestion.phone}
                  </Typography>
                )}

                {suggestion.website && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Website:</strong>{' '}
                    <a href={suggestion.website} target="_blank" rel="noopener noreferrer">
                      {suggestion.website}
                    </a>
                  </Typography>
                )}

                {suggestion.review_notes && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Admin Note:</strong> {suggestion.review_notes}
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  )
}
