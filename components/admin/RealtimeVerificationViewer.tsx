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
  expanded?: boolean
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
            expanded: true, // Running sessions start expanded
          })
        } else if (existing) {
          existing.events.push(event)

          // Update total cost
          if (event.event_type === 'cost') {
            existing.total_cost += (event.event_data.total_cost_usd as number) || 0
          }

          // Update status and auto-collapse when complete
          if (event.event_type === 'completed') {
            existing.status = 'completed'
            existing.completed_at = event.created_at
            existing.expanded = false // Auto-collapse on completion
          } else if (event.event_type === 'failed') {
            existing.status = 'failed'
            existing.completed_at = event.created_at
            existing.expanded = false // Auto-collapse on failure
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
              // Collapse any previously running sessions
              newSessions.forEach((session) => {
                if (session.status === 'running' && session.expanded) {
                  session.expanded = false
                }
              })

              // New verification session started - add at beginning (top)
              const newSessionsReordered = new Map<string, VerificationSession>()
              newSessionsReordered.set(suggestionId, {
                suggestion_id: suggestionId,
                resource_name: (event.event_data.name as string) || 'Unknown Resource',
                status: 'running',
                events: [event],
                total_cost: 0,
                started_at: event.created_at,
                expanded: true, // New sessions start expanded
              })
              // Add all existing sessions after the new one
              newSessions.forEach((session, id) => {
                newSessionsReordered.set(id, session)
              })
              return newSessionsReordered
            } else if (existing) {
              // Add event to existing session
              existing.events.push(event)

              // Update total cost
              if (event.event_type === 'cost') {
                existing.total_cost += (event.event_data.total_cost_usd as number) || 0
              }

              // Update status and auto-collapse when complete
              if (event.event_type === 'completed') {
                existing.status = 'completed'
                existing.completed_at = event.created_at
                existing.expanded = false // Auto-collapse on completion
              } else if (event.event_type === 'failed') {
                existing.status = 'failed'
                existing.completed_at = event.created_at
                existing.expanded = false // Auto-collapse on failure
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
              {runningSessions.map((session, index) => (
                <Box
                  key={session.suggestion_id}
                  sx={{
                    animation: 'slideInFromTop 0.3s ease-out',
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: 'backwards',
                  }}
                >
                  <VerificationSessionCard session={session} />
                </Box>
              ))}
            </Box>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Recent Completions
              </Typography>
              {completedSessions.map((session, index) => (
                <Box
                  key={session.suggestion_id}
                  sx={{
                    animation: 'fadeIn 0.3s ease-out',
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: 'backwards',
                  }}
                >
                  <VerificationSessionCard session={session} />
                </Box>
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

        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </Paper>
  )
}

function VerificationSessionCard({ session }: { session: VerificationSession }) {
  const [expanded, setExpanded] = useState(session.expanded ?? false)

  // Update expanded state when session.expanded changes
  useEffect(() => {
    setExpanded(session.expanded ?? false)
  }, [session.expanded])

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
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      sx={{
        mb: 1,
        bgcolor: session.status === 'running' ? 'rgba(33, 150, 243, 0.05)' : 'inherit',
        border: session.status === 'running' ? '1px solid' : 'none',
        borderColor: 'primary.light',
        transition: 'all 0.3s ease-in-out',
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
              key={`${session.suggestion_id}-${event.event_type}-${index}`}
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
              {getStepIcon(
                (typeof event.event_data.step === 'string' ? event.event_data.step : null) ||
                  event.event_type
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">
                  {(() => {
                    if (event.event_type === 'started') return '🚀 Verification started'
                    if (event.event_type === 'progress' && event.event_data.step)
                      return String(event.event_data.step)
                    if (
                      event.event_type === 'cost' &&
                      event.event_data.operation &&
                      event.event_data.total_cost_usd !== undefined
                    )
                      return `💰 ${String(event.event_data.operation)} ($${Number(event.event_data.total_cost_usd).toFixed(4)})`
                    if (event.event_type === 'completed' && event.event_data.decision)
                      return `✅ Decision: ${String(event.event_data.decision)}`
                    if (event.event_type === 'failed' && event.event_data.error)
                      return `❌ Failed: ${String(event.event_data.error)}`
                    return ''
                  })()}
                </Typography>
                {/* Show detailed reasoning for completed events */}
                {event.event_type === 'completed' && event.event_data.reasoning ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.5 }}
                  >
                    <strong>Reasoning:</strong> {String(event.event_data.reasoning)}
                  </Typography>
                ) : null}
                {/* Show checks summary for completed events */}
                {event.event_type === 'completed' && event.event_data.checks_summary ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.5 }}
                  >
                    <strong>Checks:</strong>{' '}
                    {(() => {
                      const checks = event.event_data.checks_summary as Record<string, boolean>
                      return Object.entries(checks)
                        .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value ? '✓' : '✗'}`)
                        .join(', ')
                    })()}
                  </Typography>
                ) : null}
                {/* Show overall score for completed events */}
                {event.event_type === 'completed' &&
                event.event_data.overall_score !== undefined ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.5 }}
                  >
                    <strong>Confidence Score:</strong>{' '}
                    {((event.event_data.overall_score as number) * 100).toFixed(0)}%
                  </Typography>
                ) : null}
                {/* Show details for progress events */}
                {event.event_data.details !== undefined && event.event_data.details !== null ? (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {typeof event.event_data.details === 'string'
                      ? event.event_data.details
                      : JSON.stringify(event.event_data.details)}
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
