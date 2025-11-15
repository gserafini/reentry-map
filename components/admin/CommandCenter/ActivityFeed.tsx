'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
} from '@mui/material'
import {
  ExpandMore,
  Timeline as ActivityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Psychology as AIIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface ActivityEvent {
  id: string
  type: 'resource' | 'suggestion' | 'update' | 'agent' | 'user'
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'started' | 'completed'
  description: string
  timestamp: string
  user?: string
  entityId?: string // ID of the resource/suggestion/update for linking
  resourceId?: string // For updates, the ID of the resource being updated
}

export function ActivityFeed() {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('24h')
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const handleEventClick = (event: ActivityEvent) => {
    switch (event.type) {
      case 'resource':
        if (event.entityId) {
          router.push(`/resources/${event.entityId}`)
        }
        break
      case 'suggestion':
        router.push('/admin/suggestions')
        break
      case 'update':
        if (event.resourceId) {
          router.push(`/resources/${event.resourceId}`)
        }
        break
      case 'agent':
        // Could link to agent logs in the future
        break
    }
  }

  // Fetch recent events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const now = Date.now()
        const timeRangeMs = {
          '1h': 60 * 60 * 1000,
          '6h': 6 * 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
        }[timeRange]

        const cutoffTime = new Date(now - timeRangeMs).toISOString()

        // Fetch recent changes from multiple tables
        const [resources, suggestions, updates, sessions] = await Promise.all([
          supabase
            .from('resources')
            .select('id, name, created_at, updated_at')
            .gte('created_at', cutoffTime)
            .order('created_at', { ascending: false })
            .limit(10),

          supabase
            .from('resource_suggestions')
            .select('id, name, status, created_at')
            .gte('created_at', cutoffTime)
            .order('created_at', { ascending: false })
            .limit(10),

          supabase
            .from('resource_updates')
            .select('id, resource_id, status, created_at')
            .gte('created_at', cutoffTime)
            .order('created_at', { ascending: false })
            .limit(10),

          supabase
            .from('agent_sessions')
            .select('id, agent_type, started_at, ended_at')
            .gte('started_at', cutoffTime)
            .order('started_at', { ascending: false })
            .limit(10),
        ])

        // Combine and format events
        const combinedEvents: ActivityEvent[] = []

        // Resources
        resources.data?.forEach((r) => {
          combinedEvents.push({
            id: `resource-${r.id}`,
            type: 'resource',
            action: 'created',
            description: `Resource "${r.name}" added`,
            timestamp: r.created_at,
            entityId: r.id,
          })
        })

        // Suggestions
        suggestions.data?.forEach((s) => {
          const action =
            s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : 'created'
          combinedEvents.push({
            id: `suggestion-${s.id}`,
            type: 'suggestion',
            action: action as ActivityEvent['action'],
            description: `Suggestion "${s.name}" ${action}`,
            timestamp: s.created_at,
            entityId: s.id,
          })
        })

        // Updates/Reports
        updates.data?.forEach((u) => {
          combinedEvents.push({
            id: `update-${u.id}`,
            type: 'update',
            action:
              u.status === 'approved'
                ? 'approved'
                : u.status === 'rejected'
                  ? 'rejected'
                  : 'created',
            description: `Issue report ${u.status}`,
            timestamp: u.created_at,
            entityId: u.id,
            resourceId: u.resource_id,
          })
        })

        // Agent Sessions
        sessions.data?.forEach((s) => {
          const action = s.ended_at ? 'completed' : 'started'
          combinedEvents.push({
            id: `session-${s.id}`,
            type: 'agent',
            action: action as ActivityEvent['action'],
            description: `${s.agent_type} agent ${action}`,
            timestamp: s.ended_at || s.started_at,
            entityId: s.id,
          })
        })

        // Sort by timestamp descending
        combinedEvents.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )

        setEvents(combinedEvents.slice(0, 20))
      } catch (error) {
        console.error('Error fetching activity events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [timeRange, supabase])

  // Real-time subscriptions for new events
  useEffect(() => {
    const resourcesChannel = supabase
      .channel('activity_resources')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'resources',
        },
        (payload) => {
          const newResource = payload.new as { id: string; name: string; created_at: string }
          setEvents((prev) => [
            {
              id: `resource-${newResource.id}`,
              type: 'resource',
              action: 'created',
              description: `Resource "${newResource.name}" added`,
              timestamp: newResource.created_at,
              entityId: newResource.id,
            },
            ...prev.slice(0, 19),
          ])
        }
      )
      .subscribe()

    const suggestionsChannel = supabase
      .channel('activity_suggestions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_suggestions',
        },
        (payload) => {
          const suggestion = payload.new as {
            id: string
            name: string
            status: string
            created_at: string
          }
          const action =
            suggestion.status === 'approved'
              ? 'approved'
              : suggestion.status === 'rejected'
                ? 'rejected'
                : 'created'
          setEvents((prev) => [
            {
              id: `suggestion-${suggestion.id}`,
              type: 'suggestion',
              action: action as ActivityEvent['action'],
              description: `Suggestion "${suggestion.name}" ${action}`,
              timestamp: suggestion.created_at,
              entityId: suggestion.id,
            },
            ...prev.slice(0, 19),
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(resourcesChannel)
      supabase.removeChannel(suggestionsChannel)
    }
  }, [supabase])

  const getIcon = (event: ActivityEvent) => {
    switch (event.type) {
      case 'resource':
        return <AddIcon color="success" />
      case 'suggestion':
        return event.action === 'approved' ? (
          <CheckIcon color="success" />
        ) : event.action === 'rejected' ? (
          <CancelIcon color="error" />
        ) : (
          <AddIcon color="info" />
        )
      case 'update':
        return <EditIcon color="warning" />
      case 'agent':
        return <AIIcon color="primary" />
      case 'user':
        return <PersonIcon color="secondary" />
      default:
        return <ActivityIcon />
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now()
    const time = new Date(timestamp).getTime()
    const diff = now - time

    if (diff < 60 * 1000) return 'Just now'
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: expanded ? 2 : 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ActivityIcon color="primary" />
            <Typography variant="h6">Activity Feed</Typography>
            <Chip label={events.length} size="small" />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={timeRange}
                onChange={(e: SelectChangeEvent<'1h' | '6h' | '24h'>) =>
                  setTimeRange(e.target.value as '1h' | '6h' | '24h')
                }
                sx={{ height: 32, fontSize: '0.875rem' }}
              >
                <MenuItem value="1h">1h</MenuItem>
                <MenuItem value="6h">6h</MenuItem>
                <MenuItem value="24h">24h</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              onClick={() => setExpanded(!expanded)}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
              }}
              size="small"
            >
              <ExpandMore />
            </IconButton>
          </Box>
        </Box>

        {!expanded && (
          <Typography variant="body2" color="text.secondary">
            {events.length} events in last {timeRange}
          </Typography>
        )}

        <Collapse in={expanded}>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          ) : events.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No activity in the last {timeRange}
            </Typography>
          ) : (
            <List
              dense
              sx={{
                maxHeight: 400,
                overflowY: 'auto',
                '& .MuiListItem-root': {
                  px: 0,
                  py: 0.5,
                },
              }}
            >
              {events.map((event) => (
                <ListItem
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  sx={{
                    cursor: event.entityId || event.resourceId ? 'pointer' : 'default',
                    '&:hover': {
                      bgcolor: event.entityId || event.resourceId ? 'action.hover' : 'transparent',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{getIcon(event)}</ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2">{event.description}</Typography>}
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {getTimeAgo(event.timestamp)}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Collapse>
      </CardContent>
    </Card>
  )
}
