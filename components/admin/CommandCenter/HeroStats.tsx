'use client'

import { useEffect, useState } from 'react'
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
import { createClient } from '@/lib/supabase/client'

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

  const supabase = createClient()

  // Initial fetch of all stats
  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch all stats in parallel
        const [
          resourcesCount,
          activeResourcesCount,
          suggestionsCount,
          activeSessionsCount,
          monthlyCostData,
        ] = await Promise.all([
          // Total resources
          supabase.from('resources').select('*', { count: 'exact', head: true }),

          // Active resources
          supabase
            .from('resources')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),

          // Pending suggestions
          supabase
            .from('resource_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),

          // Active verification sessions (no ended_at)
          supabase
            .from('agent_sessions')
            .select('*', { count: 'exact', head: true })
            .is('ended_at', null),

          // Monthly cost (current month)
          supabase
            .from('ai_usage_logs')
            .select('total_cost_usd')
            .gte(
              'created_at',
              new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
            ),
        ])

        // Calculate monthly cost
        const totalCost = monthlyCostData.data?.reduce(
          (sum, log) => sum + (log.total_cost_usd || 0),
          0
        )

        // Calculate daily trend for suggestions (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count: recentSuggestions } = await supabase
          .from('resource_suggestions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gte('created_at', oneDayAgo)

        setStats({
          totalResources: resourcesCount.count || 0,
          activeResources: activeResourcesCount.count || 0,
          pendingSuggestions: suggestionsCount.count || 0,
          suggestionsTrend: recentSuggestions || 0,
          activeProcesses: activeSessionsCount.count || 0,
          monthlyCost: totalCost || 0,
          monthlyBudget: 25, // TODO: Make configurable
        })
      } catch (error) {
        console.error('Error fetching hero stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  // Real-time subscription for resources
  useEffect(() => {
    const resourcesChannel = supabase
      .channel('herostats_resources')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resources',
        },
        async () => {
          // Re-fetch resource counts
          const [resourcesCount, activeCount] = await Promise.all([
            supabase.from('resources').select('*', { count: 'exact', head: true }),
            supabase
              .from('resources')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'active'),
          ])

          setStats((prev) => ({
            ...prev,
            totalResources: resourcesCount.count || 0,
            activeResources: activeCount.count || 0,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(resourcesChannel)
    }
  }, [supabase])

  // Real-time subscription for suggestions
  useEffect(() => {
    const suggestionsChannel = supabase
      .channel('herostats_suggestions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_suggestions',
        },
        async () => {
          const { count } = await supabase
            .from('resource_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')

          // Also update trend
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          const { count: recentCount } = await supabase
            .from('resource_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .gte('created_at', oneDayAgo)

          setStats((prev) => ({
            ...prev,
            pendingSuggestions: count || 0,
            suggestionsTrend: recentCount || 0,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(suggestionsChannel)
    }
  }, [supabase])

  // Real-time subscription for active sessions
  useEffect(() => {
    const sessionsChannel = supabase
      .channel('herostats_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sessions',
        },
        async () => {
          const { count } = await supabase
            .from('agent_sessions')
            .select('*', { count: 'exact', head: true })
            .is('ended_at', null)

          setStats((prev) => ({
            ...prev,
            activeProcesses: count || 0,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
    }
  }, [supabase])

  // Real-time subscription for AI costs
  useEffect(() => {
    const costsChannel = supabase
      .channel('herostats_costs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_usage_logs',
        },
        async () => {
          // Re-fetch monthly cost
          const { data } = await supabase
            .from('ai_usage_logs')
            .select('total_cost_usd')
            .gte(
              'created_at',
              new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
            )

          const totalCost = data?.reduce((sum, log) => sum + (log.total_cost_usd || 0), 0)

          setStats((prev) => ({
            ...prev,
            monthlyCost: totalCost || 0,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(costsChannel)
    }
  }, [supabase])

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
