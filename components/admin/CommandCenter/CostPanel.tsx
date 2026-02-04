'use client'

import { useEffect, useState, useCallback } from 'react'
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
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material'

interface CostBreakdown {
  operation: string
  cost: number
  count: number
}

interface CostStatsResponse {
  costs?: { monthly_cost: number; weekly_cost: number; daily_cost: number }
  costBreakdown?: CostBreakdown[]
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

  const fetchCosts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats?section=costs')
      if (!response.ok) {
        throw new Error('Failed to fetch costs')
      }
      const data = (await response.json()) as CostStatsResponse

      setMonthlyCost(data.costs?.monthly_cost || 0)
      setWeeklyCost(data.costs?.weekly_cost || 0)
      setDailyCost(data.costs?.daily_cost || 0)
      setBreakdown(data.costBreakdown || [])
    } catch (error) {
      console.error('Error fetching costs:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + polling every 60 seconds (replaces real-time subscription)
  useEffect(() => {
    fetchCosts()
    const interval = setInterval(fetchCosts, 60000)
    return () => clearInterval(interval)
  }, [fetchCosts])

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

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<TrendingUpIcon />}
                onClick={() => router.push('/admin/ai-usage')}
              >
                Detailed Report
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open('https://console.anthropic.com/usage', '_blank')}
              >
                Anthropic Console
              </Button>
            </Box>

            <Alert severity="info" sx={{ mt: 2, fontSize: '0.75rem' }}>
              <Typography variant="caption">
                Database tracking may miss early API requests. Verify against{' '}
                <a
                  href="https://console.anthropic.com/usage"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  Anthropic Console
                </a>{' '}
                for accurate totals.
              </Typography>
            </Alert>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}
