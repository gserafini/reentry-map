'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box, Card, CardContent, Typography, IconButton, Collapse, Chip } from '@mui/material'
import { ExpandMore, Psychology as AIIcon } from '@mui/icons-material'
import { RealtimeVerificationViewer } from '../RealtimeVerificationViewer'

interface SessionCountResponse {
  activeSessions?: number
}

export function RealTimeOperations() {
  const [expanded, setExpanded] = useState(true)
  const [activeCount, setActiveCount] = useState(0)

  const fetchActiveCount = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats?section=sessions')
      if (!response.ok) return
      const data = (await response.json()) as SessionCountResponse
      setActiveCount(data.activeSessions || 0)
    } catch (error) {
      console.error('Error fetching active session count:', error)
    }
  }, [])

  // Initial fetch + polling every 5 seconds (replaces real-time subscription)
  useEffect(() => {
    fetchActiveCount()
    const interval = setInterval(fetchActiveCount, 5000)
    return () => clearInterval(interval)
  }, [fetchActiveCount])

  // Auto-expand when there are active processes
  useEffect(() => {
    if (activeCount > 0 && !expanded) {
      setExpanded(true)
    }
  }, [activeCount, expanded])

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
            <AIIcon color="primary" />
            <Typography variant="h6">Real-Time Operations</Typography>
            {activeCount > 0 && (
              <Chip
                label={`${activeCount} active`}
                color="primary"
                size="small"
                sx={{
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              />
            )}
          </Box>

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

        <Collapse in={expanded}>
          <RealtimeVerificationViewer />
        </Collapse>

        {!expanded && activeCount === 0 && (
          <Typography variant="body2" color="text.secondary">
            No active verification processes
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
