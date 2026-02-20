'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  Psychology as AIIcon,
  Search as SearchIcon,
  AutoFixHigh as EnrichIcon,
  VerifiedUser as VerifyIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'

interface AgentLog {
  id: string
  agent_type: string
  status: string
  resources_processed: number | null
  resources_added: number | null
  resources_updated: number | null
  cost_cents: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export default function AgentsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [runningAgent, setRunningAgent] = useState<string | null>(null)

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/admin/agents')
        return
      }

      if (user) {
        const adminStatus = await checkCurrentUserIsAdmin()
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          router.push('/')
        }

        setCheckingAdmin(false)
      }
    }

    checkAdmin()
  }, [user, authLoading, isAuthenticated, router])

  // Fetch agent logs via API
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/dashboard/stats?section=logs')
      if (res.ok) {
        const data = (await res.json()) as { recentLogs?: AgentLog[] }
        if (data.recentLogs) {
          setLogs(data.recentLogs)
        }
      }
    } catch (error) {
      console.error('Error fetching agent logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin && !checkingAdmin) {
      fetchLogs()
    }
  }, [isAdmin, checkingAdmin])

  const runAgent = async (agentType: string) => {
    setRunningAgent(agentType)

    try {
      const response = await fetch(`/api/admin/agents/${agentType}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to run agent')
      }

      // Refresh logs via API
      await fetchLogs()

      alert(`${agentType} agent completed successfully!`)
    } catch (error) {
      console.error('Error running agent:', error)
      alert(`Failed to run ${agentType} agent`)
    } finally {
      setRunningAgent(null)
    }
  }

  const getStatusColor = (
    status: string
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'success':
        return 'success'
      case 'failure':
        return 'error'
      case 'partial':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (authLoading || checkingAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!isAdmin) {
    return null
  }

  const agents = [
    {
      name: 'Discovery Agent',
      type: 'discovery',
      description: 'Finds new reentry resources from 211 directories and government sites',
      icon: <SearchIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      name: 'Enrichment Agent',
      type: 'enrichment',
      description: 'Fills missing data using geocoding, web scraping, and Google Maps',
      icon: <EnrichIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
    },
    {
      name: 'Verification Agent',
      type: 'verification',
      description: 'Verifies resource accuracy by checking phones, websites, and addresses',
      icon: <VerifyIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
    },
  ]

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AIIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              AI Agents
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Automated resource discovery, enrichment, and verification
            </Typography>
          </Box>
        </Box>
        <Button variant="outlined" onClick={() => router.push('/admin')}>
          Back to Dashboard
        </Button>
      </Box>

      {/* Agent Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {agents.map((agent) => (
          <Grid key={agent.type} size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ color: agent.color }}>{agent.icon}</Box>
                </Box>
                <Typography variant="h6" gutterBottom>
                  {agent.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {agent.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={
                    runningAgent === agent.type ? <CircularProgress size={16} /> : <PlayIcon />
                  }
                  onClick={() => runAgent(agent.type)}
                  disabled={runningAgent !== null}
                  fullWidth
                >
                  {runningAgent === agent.type ? 'Running...' : 'Run Agent'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Note:</strong> AI agents require an OpenAI API key to be configured. They will
          process resources in batches and log all activities below. Costs are tracked in cents.
        </Typography>
      </Alert>

      {/* Agent Logs */}
      <Typography variant="h6" gutterBottom>
        Recent Agent Runs
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No agent runs yet</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Processed</TableCell>
                <TableCell align="right">Added</TableCell>
                <TableCell align="right">Updated</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Chip label={log.agent_type} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={log.status} size="small" color={getStatusColor(log.status)} />
                  </TableCell>
                  <TableCell align="right">{log.resources_processed || 0}</TableCell>
                  <TableCell align="right">{log.resources_added || 0}</TableCell>
                  <TableCell align="right">{log.resources_updated || 0}</TableCell>
                  <TableCell align="right">
                    {log.cost_cents ? `$${(log.cost_cents / 100).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
