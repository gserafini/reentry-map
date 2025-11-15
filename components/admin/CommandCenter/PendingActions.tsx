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
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Lightbulb as SuggestionsIcon,
  Flag as FlagIcon,
  ArrowForward as ArrowIcon,
  Schedule as ClockIcon,
  Psychology as AIIcon,
  PlayArrow as ProcessIcon,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface PendingStats {
  suggestions: number
  updates: number
  urgent: number
}

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (displayValue !== value) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setDisplayValue(value)
        setIsAnimating(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [value, displayValue])

  return (
    <span
      style={{
        display: 'inline-block',
        transition: 'all 0.3s ease-in-out',
        transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
        color: isAnimating ? '#1976d2' : 'inherit',
      }}
    >
      {displayValue}
    </span>
  )
}

export function PendingActions() {
  const router = useRouter()
  const [stats, setStats] = useState<PendingStats>({
    suggestions: 0,
    updates: 0,
    urgent: 0,
  })
  const [loading, setLoading] = useState(true)
  const [autoVerifyEnabled, setAutoVerifyEnabled] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<string | null>(null)

  const supabase = createClient()

  // Handle auto-verification toggle
  const handleToggleAutoVerify = () => {
    setAutoVerifyEnabled(!autoVerifyEnabled)
    setProcessResult(null)
  }

  // Process verification queue
  const handleProcessQueue = async () => {
    if (!autoVerifyEnabled || processing) return

    setProcessing(true)
    setProcessResult(null)

    try {
      const response = await fetch('/api/admin/verification/process-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchSize: 1, // Process 1 at a time for testing
        }),
      })

      const result = (await response.json()) as {
        success: boolean
        message?: string
        error?: string
        totalCost?: number
      }

      if (result.success && result.message) {
        setProcessResult(`✅ ${result.message} ($${(result.totalCost || 0).toFixed(4)} API cost)`)
      } else {
        setProcessResult(`❌ Error: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error processing queue:', error)
      setProcessResult('❌ Failed to process queue')
    } finally {
      setProcessing(false)
    }
  }

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
        {/* AI Auto-Verification Toggle */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={autoVerifyEnabled}
                onChange={handleToggleAutoVerify}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AIIcon fontSize="small" />
                <Typography variant="body2" fontWeight="medium">
                  AI Auto-Verification
                </Typography>
              </Box>
            }
          />

          {autoVerifyEnabled && stats.suggestions > 0 && (
            <Button
              variant="contained"
              size="small"
              startIcon={processing ? <CircularProgress size={16} /> : <ProcessIcon />}
              onClick={handleProcessQueue}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Process Next (1)'}
            </Button>
          )}
        </Box>

        {/* Process Result Message */}
        {processResult && (
          <Alert severity={processResult.startsWith('✅') ? 'success' : 'error'} sx={{ mb: 2 }}>
            {processResult}
          </Alert>
        )}

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Pending Actions</Typography>
            {totalPending > 0 && (
              <Chip
                label={<AnimatedCounter value={totalPending} />}
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
                            label={
                              <>
                                <AnimatedCounter value={stats.urgent} /> urgent
                              </>
                            }
                            color="error"
                            size="small"
                            sx={{ height: 20 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <AnimatedCounter value={stats.suggestions} /> waiting for review
                      </>
                    }
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
                  secondary={
                    <>
                      <AnimatedCounter value={stats.updates} /> flagged resources
                    </>
                  }
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
              Review Suggestions (<AnimatedCounter value={stats.suggestions} />)
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FlagIcon />}
              onClick={() => router.push('/admin/updates')}
              disabled={stats.updates === 0}
            >
              Review Reports (<AnimatedCounter value={stats.updates} />)
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
