'use client'

import { useState, useEffect } from 'react'
import { Box, Card, CardContent, Typography, IconButton, Collapse, Chip } from '@mui/material'
import { ExpandMore, Psychology as AIIcon } from '@mui/icons-material'
import { RealtimeVerificationViewer } from '../RealtimeVerificationViewer'
import { createClient } from '@/lib/supabase/client'

export function RealTimeOperations() {
  const [expanded, setExpanded] = useState(true)
  const [activeCount, setActiveCount] = useState(0)
  const supabase = createClient()

  // Subscribe to active sessions count
  useEffect(() => {
    async function fetchActiveCount() {
      const { count } = await supabase
        .from('agent_sessions')
        .select('*', { count: 'exact', head: true })
        .is('ended_at', null)

      setActiveCount(count || 0)
    }

    fetchActiveCount()

    // Subscribe to session changes
    const sessionsChannel = supabase
      .channel('realtime_ops_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sessions',
        },
        () => {
          fetchActiveCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
    }
  }, [supabase])

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
