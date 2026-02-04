'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Card, CardContent, Typography, Grid, Chip } from '@mui/material'
import {
  LibraryBooks as ResourcesIcon,
  Lightbulb as SuggestionsIcon,
  Psychology as AIIcon,
  AttachMoney as CostIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material'

interface HeroStat {
  title: string
  value: number
  subtitle: string
  icon: React.ReactNode
  color: string
  trend?: {
    direction: 'up' | 'down'
    value: number
  }
  link?: string
}

interface DashboardStats {
  totalResources: number
  activeResources: number
  pendingSuggestions: number
  suggestionsTrend: number
  activeProcesses: number
  monthlyCost: number
  monthlyBudget: number
}

interface DashboardStatsResponse {
  resources?: { total: number; active: number }
  suggestions?: { pending: number; recent_pending: number }
  costs?: { monthly_cost: number; weekly_cost: number; daily_cost: number }
  activeSessions?: number
}

export function HeroStats() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalResources: 0,
    activeResources: 0,
    pendingSuggestions: 0,
    suggestionsTrend: 0,
    activeProcesses: 0,
    monthlyCost: 0,
    monthlyBudget: 25,
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(
        '/api/admin/dashboard/stats?section=resources,suggestions,costs,sessions'
      )
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      const data = (await response.json()) as DashboardStatsResponse

      setStats({
        totalResources: data.resources?.total || 0,
        activeResources: data.resources?.active || 0,
        pendingSuggestions: data.suggestions?.pending || 0,
        suggestionsTrend: data.suggestions?.recent_pending || 0,
        activeProcesses: data.activeSessions || 0,
        monthlyCost: data.costs?.monthly_cost || 0,
        monthlyBudget: 25, // TODO: Make configurable
      })
    } catch (error) {
      console.error('Error fetching hero stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + polling every 10 seconds (replaces real-time subscriptions)
  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Build hero stats array
  const heroStats: HeroStat[] = [
    {
      title: 'Total Resources',
      value: stats.totalResources,
      subtitle: `${stats.activeResources} active`,
      icon: <ResourcesIcon sx={{ fontSize: 48 }} />,
      color: '#1976d2',
      link: '/admin/resources',
    },
    {
      title: 'Pending Suggestions',
      value: stats.pendingSuggestions,
      subtitle: 'Awaiting review',
      icon: <SuggestionsIcon sx={{ fontSize: 48 }} />,
      color: stats.pendingSuggestions > 50 ? '#ed6c02' : '#1976d2',
      trend:
        stats.suggestionsTrend > 0 ? { direction: 'up', value: stats.suggestionsTrend } : undefined,
      link: '/admin/suggestions',
    },
    {
      title: 'Active Processes',
      value: stats.activeProcesses,
      subtitle: stats.activeProcesses > 0 ? 'Verifying resources' : 'No active processes',
      icon: <AIIcon sx={{ fontSize: 48 }} />,
      color: stats.activeProcesses > 0 ? '#2e7d32' : '#757575',
      link: '/admin/agents',
    },
    {
      title: 'Monthly Cost',
      value: stats.monthlyCost,
      subtitle: `${((stats.monthlyCost / stats.monthlyBudget) * 100).toFixed(0)}% of $${stats.monthlyBudget} budget`,
      icon: <CostIcon sx={{ fontSize: 48 }} />,
      color:
        stats.monthlyCost / stats.monthlyBudget > 0.8
          ? '#d32f2f'
          : stats.monthlyCost / stats.monthlyBudget > 0.5
            ? '#ed6c02'
            : '#2e7d32',
      link: '/admin/ai-usage',
    },
  ]

  if (loading) {
    return (
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card sx={{ height: '100%', minHeight: 140 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Loading...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        {heroStats.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                height: '100%',
                minHeight: 140,
                cursor: stat.link ? 'pointer' : 'default',
                transition: 'all 0.2s',
                '&:hover': stat.link
                  ? {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    }
                  : {},
              }}
              onClick={() => stat.link && router.push(stat.link)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {stat.title === 'Monthly Cost' ? `$${stat.value.toFixed(2)}` : stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {stat.subtitle}
                  </Typography>

                  {stat.trend && (
                    <Chip
                      size="small"
                      icon={
                        stat.trend.direction === 'up' ? (
                          <TrendingUpIcon fontSize="small" />
                        ) : (
                          <TrendingDownIcon fontSize="small" />
                        )
                      }
                      label={`+${stat.trend.value} today`}
                      color={stat.trend.direction === 'up' ? 'success' : 'default'}
                      sx={{ height: 20 }}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
