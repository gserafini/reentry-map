'use client'

import { useState, useEffect, use } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Stack,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  SelectChangeEvent,
} from '@mui/material'
import { ArrowBack as BackIcon, Save as SaveIcon, Flag as FlagIcon } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import type {
  ExpansionPriorityWithProgress,
  UpdateExpansionPriorityRequest,
  ExpansionMilestone,
  ExpansionRegion,
  ExpansionPhase,
  ExpansionStatus,
  ExpansionResearchStatus,
} from '@/lib/types/expansion'

export default function ExpansionPriorityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [priority, setPriority] = useState<ExpansionPriorityWithProgress | null>(null)
  const [milestones, setMilestones] = useState<ExpansionMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<UpdateExpansionPriorityRequest>({})

  const fetchPriority = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/expansion-priorities/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch expansion priority')
      }

      const data = (await response.json()) as ExpansionPriorityWithProgress & {
        milestones?: ExpansionMilestone[]
      }
      setPriority(data)
      setMilestones(data.milestones || [])

      // Initialize form data
      setFormData({
        city: data.city,
        state: data.state,
        county: data.county,
        metro_area: data.metro_area,
        region: data.region,
        phase: data.phase,
        status: data.status,
        research_status: data.research_status,
        population: data.population,
        state_release_volume: data.state_release_volume,
        incarceration_rate: data.incarceration_rate,
        data_availability_score: data.data_availability_score,
        geographic_cluster_bonus: data.geographic_cluster_bonus,
        community_partner_count: data.community_partner_count,
        target_resource_count: data.target_resource_count,
        current_resource_count: data.current_resource_count,
        target_launch_date: data.target_launch_date,
        strategic_rationale: data.strategic_rationale,
        special_considerations: data.special_considerations,
        research_notes: data.research_notes,
        blockers: data.blockers,
      })
    } catch (err) {
      console.error('Error fetching priority:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPriority()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/admin/expansion-priorities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to update')
      }

      setSuccessMessage('Expansion priority updated successfully!')
      await fetchPriority() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateMilestone = async (milestoneType: string) => {
    try {
      const response = await fetch(`/api/admin/expansion-priorities/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone_type: milestoneType }),
      })

      if (!response.ok) {
        throw new Error('Failed to create milestone')
      }

      await fetchPriority() // Refresh data
      setSuccessMessage(`Milestone "${milestoneType}" created!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!priority) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Expansion priority not found</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/admin/expansion')}
          sx={{ mb: 2 }}
        >
          Back to List
        </Button>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Typography variant="h4">
              {priority.city}, {priority.state}
            </Typography>
            {priority.metro_area && (
              <Typography variant="body1" color="text.secondary">
                {priority.metro_area}
              </Typography>
            )}
          </div>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`Priority Score: ${priority.priority_score}`}
              color="primary"
              icon={<FlagIcon />}
            />
            <Chip label={priority.priority_tier.replace('_', ' ')} />
          </Stack>
        </Box>
      </Box>

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Form Fields */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Edit Expansion Priority
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
              {/* Geographic Info */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Geographic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="City"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="State"
                      value={formData.state || ''}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      inputProps={{ maxLength: 2 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="County"
                      value={formData.county || ''}
                      onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="Metro Area"
                      value={formData.metro_area || ''}
                      onChange={(e) => setFormData({ ...formData, metro_area: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Region</InputLabel>
                      <Select
                        value={formData.region || ''}
                        label="Region"
                        onChange={(e: SelectChangeEvent) =>
                          setFormData({
                            ...formData,
                            region: e.target.value as ExpansionRegion,
                          })
                        }
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="northeast">Northeast</MenuItem>
                        <MenuItem value="southeast">Southeast</MenuItem>
                        <MenuItem value="midwest">Midwest</MenuItem>
                        <MenuItem value="southwest">Southwest</MenuItem>
                        <MenuItem value="west">West</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Phase</InputLabel>
                      <Select
                        value={formData.phase || ''}
                        label="Phase"
                        onChange={(e: SelectChangeEvent) =>
                          setFormData({
                            ...formData,
                            phase: e.target.value as ExpansionPhase,
                          })
                        }
                      >
                        <MenuItem value="phase_1">Phase 1</MenuItem>
                        <MenuItem value="phase_2a">Phase 2A</MenuItem>
                        <MenuItem value="phase_2b">Phase 2B</MenuItem>
                        <MenuItem value="phase_2c">Phase 2C</MenuItem>
                        <MenuItem value="phase_2d">Phase 2D</MenuItem>
                        <MenuItem value="phase_3a">Phase 3A</MenuItem>
                        <MenuItem value="phase_3b">Phase 3B</MenuItem>
                        <MenuItem value="phase_3c">Phase 3C</MenuItem>
                        <MenuItem value="phase_4">Phase 4</MenuItem>
                        <MenuItem value="phase_5">Phase 5</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              {/* Status */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Status
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={formData.status || ''}
                        label="Status"
                        onChange={(e: SelectChangeEvent) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as ExpansionStatus,
                          })
                        }
                      >
                        <MenuItem value="identified">Identified</MenuItem>
                        <MenuItem value="researching">Researching</MenuItem>
                        <MenuItem value="ready_for_launch">Ready for Launch</MenuItem>
                        <MenuItem value="launched">Launched</MenuItem>
                        <MenuItem value="deferred">Deferred</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Research Status</InputLabel>
                      <Select
                        value={formData.research_status || ''}
                        label="Research Status"
                        onChange={(e: SelectChangeEvent) =>
                          setFormData({
                            ...formData,
                            research_status: e.target.value as ExpansionResearchStatus,
                          })
                        }
                      >
                        <MenuItem value="not_started">Not Started</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="blocked">Blocked</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              {/* Priority Factors */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Priority Factors (affects score calculation)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="Population"
                      type="number"
                      value={formData.population || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          population: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="State Release Volume (annual)"
                      type="number"
                      value={formData.state_release_volume || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          state_release_volume: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField
                      fullWidth
                      label="Data Availability (0-100)"
                      type="number"
                      value={formData.data_availability_score || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          data_availability_score: parseInt(e.target.value) || undefined,
                        })
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField
                      fullWidth
                      label="Geographic Cluster (0-100)"
                      type="number"
                      value={formData.geographic_cluster_bonus || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          geographic_cluster_bonus: parseInt(e.target.value) || undefined,
                        })
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField
                      fullWidth
                      label="Community Partners"
                      type="number"
                      value={formData.community_partner_count || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          community_partner_count: parseInt(e.target.value) || undefined,
                        })
                      }
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Resource Goals */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Resource Goals
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="Target Resource Count"
                      type="number"
                      value={formData.target_resource_count || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_resource_count: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      fullWidth
                      label="Current Resource Count"
                      type="number"
                      value={formData.current_resource_count || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          current_resource_count: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={priority.progress_percentage}
                          sx={{ height: 12, borderRadius: 6 }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(priority.progress_percentage)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Notes */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Strategic Notes
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Strategic Rationale"
                    value={formData.strategic_rationale || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        strategic_rationale: e.target.value,
                      })
                    }
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Special Considerations"
                    value={formData.special_considerations || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        special_considerations: e.target.value,
                      })
                    }
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Research Notes"
                    value={formData.research_notes || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        research_notes: e.target.value,
                      })
                    }
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Blockers"
                    value={formData.blockers || ''}
                    onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
                  />
                </Stack>
              </Box>

              {/* Save Button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  size="large"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Right Column - Milestones & Info */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Quick Actions */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Milestones
              </Typography>
              <Stack spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleCreateMilestone('research_started')}
                >
                  Mark Research Started
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleCreateMilestone('research_completed')}
                >
                  Mark Research Complete
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleCreateMilestone('resources_50_reached')}
                >
                  50 Resources Reached
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleCreateMilestone('ready_for_review')}
                >
                  Ready for Review
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Milestones History */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Milestones ({milestones.length})
              </Typography>
              <List dense>
                {milestones.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No milestones yet
                  </Typography>
                ) : (
                  milestones.map((milestone) => (
                    <ListItem key={milestone.id} disablePadding sx={{ mb: 1 }}>
                      <ListItemText
                        primary={milestone.milestone_type.replace(/_/g, ' ')}
                        secondary={new Date(milestone.milestone_date).toLocaleDateString()}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 'medium',
                        }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
