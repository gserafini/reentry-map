'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material'
import {
  ExpandMore,
  CheckCircle,
  Phone,
  Language,
  Map as MapIcon,
  AttachMoney,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface VerificationEvent {
  id: string
  suggestion_id: string
  event_type: 'started' | 'progress' | 'cost' | 'completed' | 'failed'
  event_data: Record<string, unknown>
  created_at: string
}

interface VerificationSession {
  suggestion_id: string
  resource_name: string
  status: 'running' | 'completed' | 'failed'
  events: VerificationEvent[]
  total_cost: number
  started_at: string
  completed_at?: string
}

export function RealtimeVerificationViewer() {
  const [sessions, setSessions] = useState<Map<string, VerificationSession>>(
    new Map<string, VerificationSession>()
  )
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Load recent verification sessions (last 1 hour)
  useEffect(() => {
    async function loadRecentSessions() {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { data: events, error } = await supabase
        .from('verification_events')
        .select('*')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading verification events:', error)
        setLoading(false)
        return
      }

      // Group events by suggestion_id
      const sessionsMap = new Map<string, VerificationSession>()

      for (const event of events || []) {
        const suggestionId = event.suggestion_id
        const existing = sessionsMap.get(suggestionId)

        if (!existing && event.event_type === 'started') {
          sessionsMap.set(suggestionId, {
            suggestion_id: suggestionId,
            resource_name: (event.event_data.name as string) || 'Unknown Resource',
            status: 'running',
            events: [event],
            total_cost: 0,
            started_at: event.created_at,
          })
        } else if (existing) {
          existing.events.push(event)

          // Update total cost
          if (event.event_type === 'cost') {
            existing.total_cost += (event.event_data.total_cost_usd as number) || 0
          }

          // Update status
          if (event.event_type === 'completed') {
            existing.status = 'completed'
            existing.completed_at = event.created_at
          } else if (event.event_type === 'failed') {
            existing.status = 'failed'
            existing.completed_at = event.created_at
          }
        }
      }

      setSessions(sessionsMap)
      setLoading(false)
    }

    loadRecentSessions()
  }, [supabase])

  // Subscribe to new verification events via Realtime
  useEffect(() => {
    const channel = supabase
      .channel('verification_events_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'verification_events',
        },
        (payload) => {
          const event = payload.new as VerificationEvent

          setSessions((prev) => {
            const newSessions = new Map(prev)
            const suggestionId = event.suggestion_id
            const existing = newSessions.get(suggestionId)

            if (!existing && event.event_type === 'started') {
              // New verification session started
              newSessions.set(suggestionId, {
                suggestion_id: suggestionId,
                resource_name: (event.event_data.name as string) || 'Unknown Resource',
                status: 'running',
                events: [event],
                total_cost: 0,
                started_at: event.created_at,
              })
            } else if (existing) {
              // Add event to existing session
              existing.events.push(event)

              // Update total cost
              if (event.event_type === 'cost') {
                existing.total_cost += (event.event_data.total_cost_usd as number) || 0
              }

              // Update status
              if (event.event_type === 'completed') {
                existing.status = 'completed'
                existing.completed_at = event.created_at
              } else if (event.event_type === 'failed') {
                existing.status = 'failed'
                existing.completed_at = event.created_at
              }
            }

            return newSessions
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Render loading state
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          🔄 Real-Time Verification
        </Typography>
        <LinearProgress />
      </Paper>
    )
  }

  // Convert sessions map to array and sort by started_at
  const sessionsArray = Array.from(sessions.values()).sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )

  // Separate running and completed sessions
  const runningSessions = sessionsArray.filter((s) => s.status === 'running')
  const completedSessions = sessionsArray.filter((s) => s.status !== 'running')

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6">🔄 Real-Time Verification</Typography>
        {runningSessions.length > 0 && (
          <Chip
            label={`${runningSessions.length} active`}
            color="primary"
            size="small"
            sx={{ animation: 'pulse 2s infinite' }}
          />
        )}
      </Box>

      {sessionsArray.length === 0 ? (
        <Alert severity="info">
          No verification sessions in the last hour. Start verifying resources to see live progress
          here.
        </Alert>
      ) : (
        <Box>
          {/* Running Sessions */}
          {runningSessions.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Currently Verifying...
              </Typography>
              {runningSessions.map((session) => (
                <VerificationSessionCard key={session.suggestion_id} session={session} />
              ))}
            </Box>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Recent Completions
              </Typography>
              {completedSessions.map((session) => (
                <VerificationSessionCard key={session.suggestion_id} session={session} />
              ))}
            </Box>
          )}
        </Box>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Paper>
  )
}

function VerificationSessionCard({ session }: { session: VerificationSession }) {
  const getStepIcon = (step: string) => {
    if (step.includes('phone')) return <Phone fontSize="small" />
    if (step.includes('url') || step.includes('website')) return <Language fontSize="small" />
    if (step.includes('address') || step.includes('geocod')) return <MapIcon fontSize="small" />
    if (step.includes('cost')) return <AttachMoney fontSize="small" />
    return <CheckCircle fontSize="small" />
  }

  const getStepStatus = (event: VerificationEvent) => {
    if (event.event_type === 'started') return 'info'
    if (event.event_type === 'completed') return 'success'
    if (event.event_type === 'failed') return 'error'
    if (event.event_type === 'cost') return 'warning'
    if (event.event_data.status === 'completed') return 'success'
    if (event.event_data.status === 'failed') return 'error'
    return 'default'
  }

  return (
    <Accordion
      defaultExpanded={session.status === 'running'}
      sx={{
        mb: 1,
        bgcolor: session.status === 'running' ? 'rgba(33, 150, 243, 0.05)' : 'inherit',
        border: session.status === 'running' ? '1px solid' : 'none',
        borderColor: 'primary.light',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Typography variant="body2" fontWeight="bold" sx={{ flex: 1 }}>
            {session.resource_name}
          </Typography>
          {session.status === 'running' && (
            <Chip label="In Progress" color="primary" size="small" />
          )}
          {session.status === 'completed' && (
            <Chip label="✓ Completed" color="success" size="small" />
          )}
          {session.status === 'failed' && <Chip label="✗ Failed" color="error" size="small" />}
          {session.total_cost > 0 && (
            <Chip
              label={`$${session.total_cost.toFixed(4)}`}
              size="small"
              color="warning"
              icon={<AttachMoney />}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ pl: 2 }}>
          {session.events.map((event, index) => (
            <Box
              key={event.id || index}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                mb: 1,
                pb: 1,
                borderLeft: '2px solid',
                borderColor:
                  getStepStatus(event) === 'success'
                    ? 'success.main'
                    : getStepStatus(event) === 'error'
                      ? 'error.main'
                      : getStepStatus(event) === 'warning'
                        ? 'warning.main'
                        : 'grey.300',
                pl: 2,
              }}
            >
              {getStepIcon((event.event_data.step as string) || event.event_type)}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">
                  {event.event_type === 'started' && '🚀 Verification started'}
                  {event.event_type === 'progress' && (event.event_data.step as string)}
                  {event.event_type === 'cost' &&
                    `💰 ${event.event_data.operation as string} ($${(event.event_data.total_cost_usd as number).toFixed(4)})`}
                  {event.event_type === 'completed' &&
                    `✅ Completed: ${event.event_data.decision as string}`}
                  {event.event_type === 'failed' &&
                    `❌ Failed: ${event.event_data.error as string}`}
                </Typography>
                {event.event_data.details ? (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {String(
                      typeof event.event_data.details === 'string'
                        ? event.event_data.details
                        : JSON.stringify(event.event_data.details)
                    )}
                  </Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary">
                  {new Date(event.created_at).toLocaleTimeString()}
                </Typography>
              </Box>
              {event.event_type === 'progress' && (
                <Chip
                  label={event.event_data.status as string}
                  size="small"
                  color={getStepStatus(event) as 'default' | 'success' | 'error'}
                />
              )}
            </Box>
          ))}
          {session.status === 'running' && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
            </Box>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}
