'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Collapse,
} from '@mui/material'
import {
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  ExpandMore,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface CostBreakdown {
  operation: string
  cost: number
  count: number
}

export function CostPanel() {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [monthlyCost, setMonthlyCost] = useState(0)
  const [dailyCost, setDailyCost] = useState(0)
  const [weeklyCost, setWeeklyCost] = useState(0)
  const [breakdown, setBreakdown] = useState<CostBreakdown[]>([])
  const [loading, setLoading] = useState(true)

  const monthlyBudget = 25 // TODO: Make configurable

  const supabase = createClient()

  // Fetch cost data
  useEffect(() => {
    async function fetchCosts() {
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

        // Fetch costs for different time periods
        const [monthlyData, weeklyData, dailyData] = await Promise.all([
          supabase.from('ai_usage_logs').select('*').gte('created_at', monthStart),

          supabase.from('ai_usage_logs').select('*').gte('created_at', weekStart),

          supabase.from('ai_usage_logs').select('*').gte('created_at', dayStart),
        ])

        // Calculate total costs
        const monthlyTotal = monthlyData.data?.reduce(
          (sum, log) => sum + (log.total_cost_usd || 0),
          0
        )
        const weeklyTotal = weeklyData.data?.reduce(
          (sum, log) => sum + (log.total_cost_usd || 0),
          0
        )
        const dailyTotal = dailyData.data?.reduce((sum, log) => sum + (log.total_cost_usd || 0), 0)

        setMonthlyCost(monthlyTotal || 0)
        setWeeklyCost(weeklyTotal || 0)
        setDailyCost(dailyTotal || 0)

        // Calculate breakdown by operation
        const operationCosts: Record<string, { cost: number; count: number }> = {}

        monthlyData.data?.forEach((log) => {
          const op = log.operation || 'other'
          if (!operationCosts[op]) {
            operationCosts[op] = { cost: 0, count: 0 }
          }
          operationCosts[op].cost += log.total_cost_usd || 0
          operationCosts[op].count += 1
        })

        const breakdownArray = Object.entries(operationCosts)
          .map(([operation, data]) => ({
            operation,
            cost: data.cost,
            count: data.count,
          }))
          .sort((a, b) => b.cost - a.cost)

        setBreakdown(breakdownArray)
      } catch (error) {
        console.error('Error fetching costs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCosts()

    // Refresh every 60 seconds
    const interval = setInterval(fetchCosts, 60000)

    return () => clearInterval(interval)
  }, [supabase])

  // Real-time subscription for new costs
  useEffect(() => {
    const costsChannel = supabase
      .channel('cost_panel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_usage_logs',
        },
        (payload) => {
          const newLog = payload.new as { total_cost_usd: number; operation: string }
          setMonthlyCost((prev) => prev + (newLog.total_cost_usd || 0))
          setWeeklyCost((prev) => prev + (newLog.total_cost_usd || 0))
          setDailyCost((prev) => prev + (newLog.total_cost_usd || 0))

          // Update breakdown
          setBreakdown((prev) => {
            const operation = newLog.operation || 'other'
            const existing = prev.find((b) => b.operation === operation)

            if (existing) {
              return prev.map((b) =>
                b.operation === operation
                  ? { ...b, cost: b.cost + (newLog.total_cost_usd || 0), count: b.count + 1 }
                  : b
              )
            } else {
              return [...prev, { operation, cost: newLog.total_cost_usd || 0, count: 1 }].sort(
                (a, b) => b.cost - a.cost
              )
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(costsChannel)
    }
  }, [supabase])

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Cost Tracking</Typography>
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const percentage = (monthlyCost / monthlyBudget) * 100
  const isOverBudget = percentage > 100
  const isWarning = percentage > 80

  // Calculate daily average and projection
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth = today.getDate()
  const dailyAverage = monthlyCost / dayOfMonth
  const projectedMonthly = dailyAverage * daysInMonth

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
            <MoneyIcon color="primary" />
            <Typography variant="h6">Cost Tracking</Typography>
            <Chip
              label={`${percentage.toFixed(0)}%`}
              color={isOverBudget ? 'error' : isWarning ? 'warning' : 'success'}
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="text" size="small" onClick={() => router.push('/admin/ai-usage')}>
              Details
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

        {/* Budget Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              ${monthlyCost.toFixed(2)} / ${monthlyBudget}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monthly Budget
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={Math.min(percentage, 100)}
            sx={{
              height: 8,
              borderRadius: 1,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: isOverBudget
                  ? 'error.main'
                  : isWarning
                    ? 'warning.main'
                    : 'success.main',
              },
            }}
          />
        </Box>

        {/* Alerts */}
        {isOverBudget && (
          <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
            Budget exceeded! Current spending is {((monthlyCost / monthlyBudget) * 100).toFixed(0)}%
            of budget.
          </Alert>
        )}

        {isWarning && !isOverBudget && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
            Approaching budget limit. {((monthlyCost / monthlyBudget) * 100).toFixed(0)}% of budget
            used.
          </Alert>
        )}

        {!expanded && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Today
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                ${dailyCost.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Last 7 days
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                ${weeklyCost.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Projected
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                ${projectedMonthly.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}

        <Collapse in={expanded}>
          {/* Detailed Breakdown */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Spending Breakdown
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Daily Average
                </Typography>
                <Typography variant="body2">${dailyAverage.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Projected Monthly
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color={projectedMonthly > monthlyBudget ? 'error.main' : 'inherit'}
                >
                  ${projectedMonthly.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Remaining
                </Typography>
                <Typography
                  variant="body2"
                  color={monthlyBudget - monthlyCost < 0 ? 'error.main' : 'success.main'}
                >
                  ${Math.max(0, monthlyBudget - monthlyCost).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            {breakdown.length > 0 && (
              <>
                <Typography variant="body2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  By Operation Type
                </Typography>
                <List dense disablePadding>
                  {breakdown.slice(0, 5).map((item) => (
                    <ListItem key={item.operation} sx={{ px: 0, py: 0.5 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {item.operation.replace(/_/g, ' ')}
                          </Typography>
                        }
                        secondary={`${item.count} operations`}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        ${item.cost.toFixed(2)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            <Button
              variant="outlined"
              size="small"
              fullWidth
              sx={{ mt: 2 }}
              startIcon={<TrendingUpIcon />}
              onClick={() => router.push('/admin/ai-usage')}
            >
              View Detailed Usage Report
            </Button>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}
