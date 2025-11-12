'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
} from '@mui/material'
import {
  Lightbulb as SuggestionsIcon,
  Flag as FlagIcon,
  ArrowForward as ArrowIcon,
  Schedule as ClockIcon,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface PendingStats {
  suggestions: number
  updates: number
  urgent: number
}

export function PendingActions() {
  const router = useRouter()
  const [stats, setStats] = useState<PendingStats>({
    suggestions: 0,
    updates: 0,
    urgent: 0,
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Initial fetch
  useEffect(() => {
    async function fetchPendingStats() {
      try {
        // Fetch counts in parallel
        const [suggestionsCount, updatesCount, urgentCount] = await Promise.all([
          // Pending suggestions
          supabase
            .from('resource_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),

          // Pending updates
          supabase
            .from('resource_updates')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),

          // Urgent items (older than 3 days)
          supabase
            .from('resource_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .lt('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()),
        ])

        setStats({
          suggestions: suggestionsCount.count || 0,
          updates: updatesCount.count || 0,
          urgent: urgentCount.count || 0,
        })
      } catch (error) {
        console.error('Error fetching pending stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPendingStats()
  }, [supabase])

  // Real-time subscription for suggestions
  useEffect(() => {
    const suggestionsChannel = supabase
      .channel('pending_suggestions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_suggestions',
        },
        async () => {
          const [suggestionsCount, urgentCount] = await Promise.all([
            supabase
              .from('resource_suggestions')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'pending'),

            supabase
              .from('resource_suggestions')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'pending')
              .lt('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()),
          ])

          setStats((prev) => ({
            ...prev,
            suggestions: suggestionsCount.count || 0,
            urgent: urgentCount.count || 0,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(suggestionsChannel)
    }
  }, [supabase])

  // Real-time subscription for updates
  useEffect(() => {
    const updatesChannel = supabase
      .channel('pending_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_updates',
        },
        async () => {
          const { count } = await supabase
            .from('resource_updates')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')

          setStats((prev) => ({
            ...prev,
            updates: count || 0,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(updatesChannel)
    }
  }, [supabase])

  const totalPending = stats.suggestions + stats.updates

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Pending Actions</Typography>
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Pending Actions</Typography>
            {totalPending > 0 && (
              <Chip
                label={totalPending}
                color={stats.urgent > 0 ? 'error' : totalPending > 50 ? 'warning' : 'default'}
                size="small"
              />
            )}
          </Box>

          {totalPending > 0 && (
            <Button
              variant="contained"
              size="small"
              onClick={() => router.push('/admin/suggestions')}
            >
              Review All
            </Button>
          )}
        </Box>

        {totalPending === 0 ? (
          <Typography variant="body2" color="text.secondary">
            ✅ All caught up! No pending items to review.
          </Typography>
        ) : (
          <List dense disablePadding>
            {/* Pending Suggestions */}
            {stats.suggestions > 0 && (
              <>
                <ListItem>
                  <SuggestionsIcon sx={{ mr: 2, color: 'warning.main' }} />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          Resource Suggestions
                        </Typography>
                        {stats.urgent > 0 && (
                          <Chip
                            icon={<ClockIcon fontSize="small" />}
                            label={`${stats.urgent} urgent`}
                            color="error"
                            size="small"
                            sx={{ height: 20 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={`${stats.suggestions} waiting for review`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => router.push('/admin/suggestions')}
                    >
                      <ArrowIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {stats.updates > 0 && <Divider />}
              </>
            )}

            {/* Pending Updates/Reports */}
            {stats.updates > 0 && (
              <ListItem>
                <FlagIcon sx={{ mr: 2, color: 'error.main' }} />
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="bold">
                      Issue Reports
                    </Typography>
                  }
                  secondary={`${stats.updates} flagged resources`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => router.push('/admin/updates')}>
                    <ArrowIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            )}
          </List>
        )}

        {/* Quick Actions */}
        {totalPending > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SuggestionsIcon />}
              onClick={() => router.push('/admin/suggestions')}
              disabled={stats.suggestions === 0}
            >
              Review Suggestions ({stats.suggestions})
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FlagIcon />}
              onClick={() => router.push('/admin/updates')}
              disabled={stats.updates === 0}
            >
              Review Reports ({stats.updates})
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
