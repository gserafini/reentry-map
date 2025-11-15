'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
} from '@mui/material'
import { Map as MapIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material'
import type { ExpansionPriorityWithProgress } from '@/lib/types/expansion'

interface CoverageMetrics {
  totalCounties: number
  coveredCounties: number
  coveragePercentage: number
  totalResources: number
}

interface CoverageApiResponse {
  summary: {
    total_resources: number
    counties_with_coverage: number
    tier1_counties_total: number
    tier1_counties_covered: number
    tier1_coverage_percent: number
  }
}

export function CoverageSnapshot() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<CoverageMetrics>({
    totalCounties: 0,
    coveredCounties: 0,
    coveragePercentage: 0,
    totalResources: 0,
  })
  const [topPriorities, setTopPriorities] = useState<ExpansionPriorityWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCoverageData() {
      try {
        // Fetch coverage metrics and top priorities in parallel
        const [metricsResponse, prioritiesResponse] = await Promise.all([
          fetch('/api/admin/coverage/metrics'),
          fetch(
            '/api/admin/expansion-priorities?sort_field=priority_score&sort_direction=desc&limit=5'
          ),
        ])

        if (metricsResponse.ok) {
          const apiData = (await metricsResponse.json()) as CoverageApiResponse
          // Transform API response to match component's expected shape
          setMetrics({
            totalCounties: apiData.summary?.tier1_counties_total || 0,
            coveredCounties: apiData.summary?.tier1_counties_covered || 0,
            coveragePercentage: apiData.summary?.tier1_coverage_percent || 0,
            totalResources: apiData.summary?.total_resources || 0,
          })
        }

        if (prioritiesResponse.ok) {
          const prioritiesData =
            (await prioritiesResponse.json()) as ExpansionPriorityWithProgress[]
          setTopPriorities(prioritiesData)
        }
      } catch (error) {
        console.error('Error fetching coverage data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCoverageData()

    // Refresh every 5 minutes
    const interval = setInterval(fetchCoverageData, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Coverage Snapshot</Typography>
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
            <MapIcon color="primary" />
            <Typography variant="h6">Coverage Snapshot</Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => router.push('/admin/coverage-map')}
          >
            View Map
          </Button>
        </Box>

        {/* Coverage Metrics */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              {metrics.coveredCounties} of {metrics.totalCounties} counties
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {metrics.coveragePercentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={metrics.coveragePercentage}
            sx={{
              height: 8,
              borderRadius: 1,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor:
                  metrics.coveragePercentage >= 80
                    ? 'success.main'
                    : metrics.coveragePercentage >= 50
                      ? 'warning.main'
                      : 'primary.main',
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {metrics.totalResources} total resources nationwide
          </Typography>
        </Box>

        {/* Top Expansion Priorities */}
        {topPriorities.length > 0 && (
          <>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Top Expansion Priorities
            </Typography>
            <List dense disablePadding>
              {topPriorities.slice(0, 5).map((priority, index) => (
                <ListItem
                  key={priority.id}
                  sx={{
                    px: 0,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => router.push(`/admin/expansion/${priority.id}`)}
                >
                  <Chip
                    label={`#${index + 1}`}
                    size="small"
                    sx={{ mr: 1, minWidth: 36, height: 20, fontSize: '0.7rem' }}
                    color={index === 0 ? 'primary' : 'default'}
                  />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2">
                          {priority.city}, {priority.state}
                        </Typography>
                        {priority.research_status === 'in_progress' && (
                          <Chip
                            label="Active"
                            color="success"
                            size="small"
                            sx={{ height: 16, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        Score: {priority.priority_score?.toFixed(1)} •{' '}
                        {priority.current_resource_count}/{priority.target_resource_count} resources
                      </Typography>
                    }
                  />
                  <Chip
                    icon={<TrendingUpIcon fontSize="small" />}
                    label={`${priority.progress_percentage?.toFixed(0) || 0}%`}
                    size="small"
                    color={
                      (priority.progress_percentage || 0) >= 80
                        ? 'success'
                        : (priority.progress_percentage || 0) >= 50
                          ? 'warning'
                          : 'default'
                    }
                    sx={{ height: 20 }}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {topPriorities.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No expansion priorities set. Create priorities to track coverage goals.
          </Typography>
        )}

        <Button
          variant="text"
          size="small"
          fullWidth
          sx={{ mt: 2 }}
          onClick={() => router.push('/admin/expansion')}
        >
          Manage Expansion Priorities
        </Button>
      </CardContent>
    </Card>
  )
}
