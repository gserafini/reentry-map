'use client'

import { useEffect, useState, useCallback } from 'react'
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

interface ActivityFeedResponse {
  activity?: {
    resources: Array<{ id: string; name: string; created_at: string; updated_at: string }>
    suggestions: Array<{ id: string; name: string; status: string; created_at: string }>
    updates: Array<{ id: string; resource_id: string; status: string; created_at: string }>
    sessions: Array<{ id: string; agent_type: string; started_at: string; ended_at: string | null }>
  }
}

export function ActivityFeed() {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('24h')
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

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

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/dashboard/stats?section=activity&timeRange=${timeRange}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }
      const data = (await response.json()) as ActivityFeedResponse

      if (!data.activity) {
        setEvents([])
        return
      }

      // Combine and format events
      const combinedEvents: ActivityEvent[] = []

      // Resources
      data.activity.resources?.forEach((r) => {
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
      data.activity.suggestions?.forEach((s) => {
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
      data.activity.updates?.forEach((u) => {
        combinedEvents.push({
          id: `update-${u.id}`,
          type: 'update',
          action:
            u.status === 'approved' ? 'approved' : u.status === 'rejected' ? 'rejected' : 'created',
          description: `Issue report ${u.status}`,
          timestamp: u.created_at,
          entityId: u.id,
          resourceId: u.resource_id,
        })
      })

      // Agent Sessions
      data.activity.sessions?.forEach((s) => {
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
  }, [timeRange])

  // Initial fetch + polling every 10 seconds (replaces real-time subscriptions)
  useEffect(() => {
    setLoading(true)
    fetchEvents()
    const interval = setInterval(fetchEvents, 10000)
    return () => clearInterval(interval)
  }, [fetchEvents])

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
