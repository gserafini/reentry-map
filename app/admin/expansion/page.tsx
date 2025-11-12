'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  SelectChangeEvent,
} from '@mui/material'
import { Add as AddIcon, Refresh as RefreshIcon, Edit as EditIcon } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import type {
  ExpansionPriorityWithProgress,
  ExpansionStatus,
  ExpansionResearchStatus,
  CreateExpansionPriorityRequest,
} from '@/lib/types/expansion'

export default function ExpansionPrioritiesPage() {
  const router = useRouter()
  const [priorities, setPriorities] = useState<ExpansionPriorityWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<ExpansionStatus | 'all'>('all')
  const [researchStatusFilter, setResearchStatusFilter] = useState<ExpansionResearchStatus | 'all'>(
    'all'
  )
  const [searchQuery, setSearchQuery] = useState('')

  const fetchPriorities = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        sort_field: 'priority_score',
        sort_direction: 'desc',
        limit: '100',
      })

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (researchStatusFilter !== 'all') {
        params.set('research_status', researchStatusFilter)
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`/api/admin/expansion-priorities?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch expansion priorities')
      }

      const result = (await response.json()) as { data?: ExpansionPriorityWithProgress[] }
      setPriorities(result.data || [])
    } catch (err) {
      console.error('Error fetching priorities:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPriorities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, researchStatusFilter, searchQuery])

  const getStatusColor = (status: ExpansionStatus) => {
    switch (status) {
      case 'identified':
        return 'default'
      case 'researching':
        return 'info'
      case 'ready_for_launch':
        return 'warning'
      case 'launched':
        return 'success'
      case 'deferred':
        return 'default'
      case 'rejected':
        return 'error'
      default:
        return 'default'
    }
  }

  const getResearchStatusColor = (status: ExpansionResearchStatus) => {
    switch (status) {
      case 'not_started':
        return 'default'
      case 'in_progress':
        return 'info'
      case 'completed':
        return 'success'
      case 'blocked':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">Expansion Priorities</Typography>
        <Stack direction="row" spacing={2}>
          <IconButton onClick={fetchPriorities} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Location
          </Button>
        </Stack>
      </Box>

      {/* Priority Algorithm Explanation */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Priority Ranking Algorithm
        </Typography>
        <Typography variant="body2" paragraph sx={{ mb: 1 }}>
          Locations are automatically scored 0-1,000 based on five factors:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          <Typography component="li" variant="body2">
            <strong>Metro Population</strong> (0-300 pts): Larger metros = more people to serve
          </Typography>
          <Typography component="li" variant="body2">
            <strong>State Release Volume</strong> (0-250 pts): Annual prison releases from state
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Data Availability</strong> (0-200 pts): Quality of local reentry data sources
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Geographic Clustering</strong> (0-150 pts): Proximity to existing coverage
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Community Partners</strong> (0-100 pts): Known local organizations (10 pts each,
            max 10)
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Scores automatically recalculate when factors are updated
        </Typography>
      </Alert>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, metro area..."
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e: SelectChangeEvent) =>
                setStatusFilter(e.target.value as ExpansionStatus | 'all')
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="identified">Identified</MenuItem>
              <MenuItem value="researching">Researching</MenuItem>
              <MenuItem value="ready_for_launch">Ready for Launch</MenuItem>
              <MenuItem value="launched">Launched</MenuItem>
              <MenuItem value="deferred">Deferred</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Research Status</InputLabel>
            <Select
              value={researchStatusFilter}
              label="Research Status"
              onChange={(e: SelectChangeEvent) =>
                setResearchStatusFilter(e.target.value as ExpansionResearchStatus | 'all')
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="not_started">Not Started</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary">
            {priorities.length} locations
          </Typography>
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Location</TableCell>
              <TableCell>Priority Score</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Research</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Phase</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {priorities.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No expansion priorities found. Add a location to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              priorities.map((priority) => (
                <TableRow
                  key={priority.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/admin/expansion/${priority.id}`)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {priority.city}, {priority.state}
                    </Typography>
                    {priority.metro_area && (
                      <Typography variant="caption" color="text.secondary">
                        {priority.metro_area}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6">{priority.priority_score}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={priority.priority_tier.replace('_', ' ')}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={priority.status.replace('_', ' ')}
                      size="small"
                      color={getStatusColor(priority.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={priority.research_status.replace('_', ' ')}
                      size="small"
                      color={getResearchStatusColor(priority.research_status)}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={priority.progress_percentage}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(priority.progress_percentage)}%
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {priority.current_resource_count}/{priority.target_resource_count}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {priority.phase && (
                      <Chip
                        label={priority.phase.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/expansion/${priority.id}`)
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog - Basic for now */}
      <CreateExpansionDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={() => {
          setCreateDialogOpen(false)
          fetchPriorities()
        }}
      />
    </Box>
  )
}

// Simple create dialog
function CreateExpansionDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [formData, setFormData] = useState<CreateExpansionPriorityRequest>({
    city: '',
    state: '',
    metro_area: '',
    phase: 'phase_1',
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    try {
      setCreating(true)
      setError(null)

      const response = await fetch('/api/admin/expansion-priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to create expansion priority')
      }

      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Expansion Location</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="City"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />

          <TextField
            label="State (2-letter code)"
            required
            value={formData.state}
            onChange={(e) =>
              setFormData({
                ...formData,
                state: e.target.value.toUpperCase(),
              })
            }
            inputProps={{ maxLength: 2 }}
          />

          <TextField
            label="Metro Area"
            value={formData.metro_area}
            onChange={(e) => setFormData({ ...formData, metro_area: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={creating || !formData.city || !formData.state}
        >
          {creating ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
