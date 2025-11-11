'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material'
import {
  ExpandMore,
  AutoAwesome as PromptIcon,
  Map as MapIcon,
  TrendingUp as ProgressIcon,
} from '@mui/icons-material'
import type { ExpansionPriorityWithProgress } from '@/lib/types/expansion'

export function ResearchMission() {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [currentTarget, setCurrentTarget] = useState<ExpansionPriorityWithProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCurrentTarget() {
      try {
        // Fetch top priority with 'active' or 'in_progress' status
        const response = await fetch(
          '/api/admin/expansion-priorities?status=active&sort_field=priority_score&sort_direction=desc&limit=1'
        )

        if (!response.ok) {
          throw new Error('Failed to fetch expansion priorities')
        }

        const data = (await response.json()) as ExpansionPriorityWithProgress[]

        if (data && data.length > 0) {
          setCurrentTarget(data[0])
        }
      } catch (error) {
        console.error('Error fetching current target:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentTarget()

    // Refresh every 60 seconds
    const interval = setInterval(fetchCurrentTarget, 60000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Research Mission</Typography>
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (!currentTarget) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MapIcon color="primary" />
              <Typography variant="h6">Research Mission</Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<PromptIcon />}
              onClick={() => router.push('/admin/prompt-generator')}
            >
              Generate Prompt
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No active research targets. Create a new expansion priority to start researching new
            areas.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 2 }}
            onClick={() => router.push('/admin/expansion')}
          >
            Manage Expansion Priorities
          </Button>
        </CardContent>
      </Card>
    )
  }

  const progress = currentTarget.progress_percentage || 0
  const resourceCount = currentTarget.current_resources || 0
  const targetCount = currentTarget.target_resources || 50

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapIcon color="primary" />
            <Typography variant="h6">Research Mission</Typography>
            <Chip
              label={currentTarget.research_status || 'active'}
              color={
                currentTarget.research_status === 'completed'
                  ? 'success'
                  : currentTarget.research_status === 'in_progress'
                    ? 'warning'
                    : 'default'
              }
              size="small"
            />
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

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              {currentTarget.city_name}, {currentTarget.state_code}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {resourceCount}/{targetCount} resources ({progress.toFixed(0)}%)
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 1,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor:
                  progress >= 80
                    ? 'success.main'
                    : progress >= 50
                      ? 'warning.main'
                      : 'primary.main',
              },
            }}
          />
        </Box>

        {!expanded && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PromptIcon />}
              onClick={() => router.push('/admin/prompt-generator')}
              fullWidth
            >
              Generate Research Prompt
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ProgressIcon />}
              onClick={() => router.push(`/admin/expansion/${currentTarget.id}`)}
              fullWidth
            >
              View Progress
            </Button>
          </Box>
        )}

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Priority Score: {currentTarget.priority_score?.toFixed(2)}
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
              Target: {currentTarget.target_resources} resources across all categories
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<PromptIcon />}
                onClick={() => router.push('/admin/prompt-generator')}
                fullWidth
              >
                Generate Research Prompt
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ProgressIcon />}
                onClick={() => router.push(`/admin/expansion/${currentTarget.id}`)}
                fullWidth
              >
                View Detailed Progress
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MapIcon />}
                onClick={() => router.push('/admin/expansion')}
                fullWidth
              >
                Manage All Targets
              </Button>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}
