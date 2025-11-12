'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'

interface AIUsageSummary {
  date: string
  operation_type: string
  provider: string
  model: string
  api_calls: number
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_cost_usd: number
}

interface BudgetStatus {
  month: string
  month_total_usd: number
  total_api_calls: number
  anthropic_cost_usd: number
  openai_cost_usd: number
}

export default function AIUsageAdminPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<AIUsageSummary[]>([])
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([])
  const [dateFilter, setDateFilter] = useState('7') // days

  // Monthly budget limit (configurable)
  const MONTHLY_BUDGET_LIMIT = 50 // $50/month

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/admin/ai-usage')
        return
      }

      if (user) {
        const adminStatus = await checkCurrentUserIsAdmin()
        setIsAdmin(adminStatus)
        if (!adminStatus) router.push('/')
        setCheckingAdmin(false)
      }
    }
    checkAdmin()
  }, [user, authLoading, isAuthenticated, router])

  // Fetch AI usage data
  useEffect(() => {
    async function fetchUsage() {
      if (!isAdmin) return

      setLoading(true)
      try {
        const response = await fetch(`/api/admin/ai-usage?days=${dateFilter}`)
        const data = (await response.json()) as {
          usage: AIUsageSummary[]
          budget: BudgetStatus[]
        }

        setUsage(data.usage || [])
        setBudgetStatus(data.budget || [])
      } catch (error) {
        console.error('Error fetching AI usage:', error)
      }
      setLoading(false)
    }

    if (isAdmin && !checkingAdmin) {
      fetchUsage()
    }
  }, [isAdmin, checkingAdmin, dateFilter])

  // Calculate totals
  const totalCost = usage.reduce((sum, item) => sum + Number(item.total_cost_usd), 0)
  const totalCalls = usage.reduce((sum, item) => sum + item.api_calls, 0)
  const totalTokens = usage.reduce((sum, item) => sum + item.total_tokens, 0)
  const avgCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0

  // Current month budget
  const currentMonth = budgetStatus.length > 0 ? budgetStatus[0] : null
  const budgetUsed = currentMonth ? Number(currentMonth.month_total_usd) : 0
  const budgetPercentage = (budgetUsed / MONTHLY_BUDGET_LIMIT) * 100

  if (authLoading || checkingAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!isAdmin) return null

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          AI Usage & Cost Tracking
        </Typography>
      </Box>

      {/* Budget Alert */}
      {budgetPercentage > 80 && (
        <Alert severity={budgetPercentage > 100 ? 'error' : 'warning'} sx={{ mb: 3 }}>
          <strong>{budgetPercentage > 100 ? 'Budget Exceeded!' : 'Budget Warning!'}</strong>{' '}
          You&apos;ve used ${budgetUsed.toFixed(2)} of your ${MONTHLY_BUDGET_LIMIT} monthly budget (
          {budgetPercentage.toFixed(0)}%)
        </Alert>
      )}

      {/* Budget Status Card */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Monthly Budget Status
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              ${budgetUsed.toFixed(2)} / ${MONTHLY_BUDGET_LIMIT.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {budgetPercentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(budgetPercentage, 100)}
            color={budgetPercentage > 100 ? 'error' : budgetPercentage > 80 ? 'warning' : 'primary'}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {currentMonth && `${currentMonth.total_api_calls} API calls this month`}
        </Typography>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Total Cost
                </Typography>
              </Box>
              <Typography variant="h4">${totalCost.toFixed(4)}</Typography>
              <Typography variant="caption" color="text.secondary">
                Last {dateFilter} days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CampaignIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  API Calls
                </Typography>
              </Box>
              <Typography variant="h4">{totalCalls.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">
                Total requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Tokens Used
                </Typography>
              </Box>
              <Typography variant="h4">{(totalTokens / 1000).toFixed(1)}k</Typography>
              <Typography variant="caption" color="text.secondary">
                Input + Output
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SpeedIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Avg Cost/Call
                </Typography>
              </Box>
              <Typography variant="h4">${avgCostPerCall.toFixed(4)}</Typography>
              <Typography variant="caption" color="text.secondary">
                Per verification
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Time Period</InputLabel>
          <Select
            value={dateFilter}
            label="Time Period"
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <MenuItem value="1">Last 24 hours</MenuItem>
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Usage Details Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : usage.length === 0 ? (
        <Alert severity="info">No AI usage data found for this time period.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Operation</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Model</TableCell>
                <TableCell align="right">API Calls</TableCell>
                <TableCell align="right">Tokens</TableCell>
                <TableCell align="right">Cost (USD)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usage.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.operation_type}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.provider}
                      size="small"
                      color={row.provider === 'anthropic' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{row.model}</TableCell>
                  <TableCell align="right">{row.api_calls}</TableCell>
                  <TableCell align="right">{row.total_tokens.toLocaleString()}</TableCell>
                  <TableCell align="right">${Number(row.total_cost_usd).toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Cost Projections */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Estimated Costs for New Operations
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Verify 100 resources
            </Typography>
            <Typography variant="h6">${(avgCostPerCall * 100).toFixed(2)}</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Verify 1,000 resources (new county)
            </Typography>
            <Typography variant="h6">${(avgCostPerCall * 1000).toFixed(2)}</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Verify 10,000 resources (new state)
            </Typography>
            <Typography variant="h6">${(avgCostPerCall * 10000).toFixed(2)}</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Remaining budget this month
            </Typography>
            <Typography
              variant="h6"
              color={budgetUsed >= MONTHLY_BUDGET_LIMIT ? 'error' : 'success'}
            >
              ${Math.max(0, MONTHLY_BUDGET_LIMIT - budgetUsed).toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  )
}
