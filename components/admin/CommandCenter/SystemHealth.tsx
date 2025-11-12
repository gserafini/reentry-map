'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
} from '@mui/material'
import {
  ExpandMore,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  SmartToy as SmartToyIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material'
import { getAISystemStatus } from '@/lib/api/settings'
import type { AISystemStatus } from '@/lib/types/settings'

export function SystemHealth() {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<AISystemStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const aiStatus = await getAISystemStatus()
        setStatus(aiStatus)
      } catch (error) {
        console.error('Error fetching AI system status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()

    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">System Health</Typography>
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const systems = [
    {
      name: 'Discovery Agent',
      icon: <SearchIcon />,
      enabled: status?.discoveryEnabled ?? false,
      description: 'Finds new resources',
    },
    {
      name: 'Enrichment Agent',
      icon: <AutoAwesomeIcon />,
      enabled: status?.enrichmentEnabled ?? false,
      description: 'Fills missing data',
    },
    {
      name: 'Verification Agent',
      icon: <VisibilityIcon />,
      enabled: status?.verificationEnabled ?? false,
      description: 'Verifies resource accuracy',
    },
  ]

  const allOnline = systems.every((s) => s.enabled)
  const allOffline = systems.every((s) => !s.enabled)

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
            <SmartToyIcon color="primary" />
            <Typography variant="h6">System Health</Typography>
            <Chip
              label={allOnline ? 'All Online' : allOffline ? 'All Offline' : 'Partial'}
              color={allOnline ? 'success' : allOffline ? 'default' : 'warning'}
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="text"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => router.push('/admin/settings')}
            >
              Configure
            </Button>
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
            {allOnline
              ? '✅ All AI systems operational'
              : allOffline
                ? '⏸️ All AI systems paused'
                : `⚠️ ${systems.filter((s) => s.enabled).length}/${systems.length} systems active`}
          </Typography>
        )}

        <Collapse in={expanded}>
          <List dense>
            {systems.map((system) => (
              <ListItem key={system.name}>
                <ListItemIcon>{system.icon}</ListItemIcon>
                <ListItemText primary={system.name} secondary={system.description} />
                {system.enabled ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <ErrorIcon color="disabled" />
                )}
              </ListItem>
            ))}
          </List>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {allOnline
                ? 'All AI agents are running and processing requests.'
                : allOffline
                  ? 'All AI agents are currently disabled. Enable them in settings.'
                  : 'Some AI agents are disabled. Review settings to enable all systems.'}
            </Typography>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}
