'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Refresh, Launch, Search, Checklist } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'
import { CATEGORIES, getCategoryLabel } from '@/lib/utils/categories'
import {
  ADDRESS_TYPES,
  requiresServiceArea,
  requiresStreetAddress,
} from '@/lib/utils/resource-location'

type ExistingResource = {
  id: string
  name: string
  primary_category: string | null
  address_type: string | null
  verification_status: string | null
}

type SubmittedResource = {
  id: string
  name: string
  primary_category: string | null
  verification_status: string | null
  created_at: string
}

type ResearchMission = {
  task_id: string
  city: string
  state: string
  categories: string[]
  target_count: number
  current_found: number
  remaining: number
  instructions: string
  suggested_queries: string[]
  existing_resources: ExistingResource[]
  submitted_this_task: SubmittedResource[]
}

const DISCOVERY_METHODS = [
  { value: 'websearch', label: 'Web search' },
  { value: 'webfetch', label: 'Web fetch' },
  { value: 'manual', label: 'Manual' },
]

function defaultCategory(mission: ResearchMission | null): string {
  return mission?.categories?.[0] || 'housing'
}

export default function ResearchIntakePage() {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [mission, setMission] = useState<ResearchMission | null>(null)
  const [loadingMission, setLoadingMission] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('housing')
  const [addressType, setAddressType] = useState('physical')
  const [address, setAddress] = useState('')
  const [serviceAreaType, setServiceAreaType] = useState('statewide')
  const [serviceAreaValues, setServiceAreaValues] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [discoveredVia, setDiscoveredVia] = useState('websearch')
  const [discoveryNotes, setDiscoveryNotes] = useState('')

  const serviceAreaNeeded = useMemo(() => requiresServiceArea(addressType), [addressType])
  const streetAddressNeeded = useMemo(() => requiresStreetAddress(addressType), [addressType])

  const resetEntry = (nextMission: ResearchMission | null = mission) => {
    setName('')
    setCategory(defaultCategory(nextMission))
    setAddressType('physical')
    setAddress('')
    setServiceAreaType('statewide')
    setServiceAreaValues('')
    setPhone('')
    setEmail('')
    setWebsite('')
    setDescription('')
    setDiscoveredVia('websearch')
    setDiscoveryNotes('')
  }

  const loadMission = async () => {
    setLoadingMission(true)
    setError(null)

    try {
      const response = await fetch('/api/research/next', { cache: 'no-store' })
      const data = (await response.json()) as
        | ResearchMission
        | {
            message?: string
            details?: string
            error?: string
          }

      if (!response.ok) {
        throw new Error('error' in data && data.error ? data.error : 'Failed to load research task')
      }

      if (!('task_id' in data)) {
        setMission(null)
        setSuccess(data.details || data.message || 'No active research task available.')
        return
      }

      setMission(data)
      setCategory(defaultCategory(data))
      setSuccess(null)
    } catch (err) {
      setMission(null)
      setError(err instanceof Error ? err.message : 'Failed to load research task')
    } finally {
      setLoadingMission(false)
    }
  }

  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/admin/research-intake')
        return
      }

      if (user) {
        const adminStatus = await checkCurrentUserIsAdmin()
        setIsAdmin(adminStatus)
        if (!adminStatus) {
          router.push('/')
          return
        }
        setCheckingAdmin(false)
      }
    }

    checkAdmin()
  }, [authLoading, isAuthenticated, router, user])

  useEffect(() => {
    if (isAdmin && !checkingAdmin) {
      void loadMission()
    }
  }, [checkingAdmin, isAdmin])

  const handleSubmit = async () => {
    if (!mission) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        task_id: mission.task_id,
        name,
        city: mission.city,
        state: mission.state,
        category,
        address_type: addressType,
        address: streetAddressNeeded ? address : '',
        service_area: serviceAreaNeeded
          ? {
              type: serviceAreaType,
              values: serviceAreaValues
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean),
            }
          : undefined,
        phone,
        email,
        website,
        description,
        discovered_via: discoveredVia,
        discovery_notes: discoveryNotes,
      }

      const response = await fetch('/api/research/submit-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as {
        success?: boolean
        resource_id?: string
        error?: string
        details?: string
        duplicate?: { name?: string }
      }

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            data.duplicate?.name
              ? `Duplicate warning: ${data.duplicate.name} already exists.`
              : data.details || data.error || 'Duplicate resource detected.'
          )
        }

        throw new Error(data.details || data.error || 'Failed to submit resource')
      }

      setSuccess(`Published live as pending verification: ${name}`)
      resetEntry(mission)
      await loadMission()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit resource')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || checkingAdmin) {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!isAdmin) return null

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Trusted Research Intake
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Publish trusted finds live now, then let verification sweeps clean up edge cases later.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => void loadMission()}>
            Refresh Target
          </Button>
          <Button variant="outlined" onClick={() => router.push('/admin/command-center')}>
            Command Center
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {loadingMission ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Paper>
      ) : !mission ? (
        <Alert severity="info">No active research target is available right now.</Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Current Target
                  </Typography>
                  <Typography variant="h5">
                    {mission.city}, {mission.state}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {mission.instructions}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    icon={<Checklist />}
                    label={`${mission.current_found}/${mission.target_count}`}
                  />
                  <Chip color="primary" label={`${mission.remaining} remaining`} />
                  {mission.categories.map((entry) => (
                    <Chip key={entry} variant="outlined" label={getCategoryLabel(entry as never)} />
                  ))}
                </Stack>

                <Divider />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                      label="Resource Name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      select
                      label="Category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      fullWidth
                    >
                      {CATEGORIES.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      select
                      label="Address Type"
                      value={addressType}
                      onChange={(event) => setAddressType(event.target.value)}
                      fullWidth
                    >
                      {ADDRESS_TYPES.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="City"
                      value={mission.city}
                      fullWidth
                      slotProps={{ input: { readOnly: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="State"
                      value={mission.state}
                      fullWidth
                      slotProps={{ input: { readOnly: true } }}
                    />
                  </Grid>

                  {streetAddressNeeded && (
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Street Address"
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        fullWidth
                        required
                      />
                    </Grid>
                  )}

                  {serviceAreaNeeded && (
                    <>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          label="Service Area Type"
                          value={serviceAreaType}
                          onChange={(event) => setServiceAreaType(event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 8 }}>
                        <TextField
                          label="Service Area Values"
                          value={serviceAreaValues}
                          onChange={(event) => setServiceAreaValues(event.target.value)}
                          helperText="Comma-separated, e.g. Texas or Lubbock County, Crosby County"
                          fullWidth
                          required
                        />
                      </Grid>
                    </>
                  )}

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Website"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                      fullWidth
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      fullWidth
                      multiline
                      minRows={3}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      select
                      label="Discovered Via"
                      value={discoveredVia}
                      onChange={(event) => setDiscoveredVia(event.target.value)}
                      fullWidth
                    >
                      {DISCOVERY_METHODS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                      label="Discovery Notes"
                      value={discoveryNotes}
                      onChange={(event) => setDiscoveryNotes(event.target.value)}
                      helperText="Required. Capture the search query, source URL, and the proof that this serves the target city."
                      fullWidth
                      multiline
                      minRows={3}
                      required
                    />
                  </Grid>
                </Grid>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                  >
                    {submitting ? 'Publishing...' : 'Publish Live'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => resetEntry(mission)}
                    disabled={submitting}
                  >
                    Clear Form
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack spacing={3}>
              <Paper sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <Search color="primary" />
                  <Typography variant="h6">Suggested Queries</Typography>
                </Stack>
                <Stack spacing={1}>
                  {mission.suggested_queries.map((query) => (
                    <Paper key={query} variant="outlined" sx={{ px: 1.5, py: 1 }}>
                      <Typography variant="body2">{query}</Typography>
                    </Paper>
                  ))}
                </Stack>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <Launch color="primary" />
                  <Typography variant="h6">
                    Existing Resources ({mission.existing_resources.length})
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  {mission.existing_resources.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No live resources yet for this city.
                    </Typography>
                  ) : (
                    mission.existing_resources.map((resource) => (
                      <Paper key={resource.id} variant="outlined" sx={{ px: 1.5, py: 1.25 }}>
                        <Typography variant="subtitle2">{resource.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {resource.primary_category || 'uncategorized'} •{' '}
                          {resource.address_type || 'physical'} •{' '}
                          {resource.verification_status || 'pending'}
                        </Typography>
                      </Paper>
                    ))
                  )}
                </Stack>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Submitted This Task ({mission.submitted_this_task.length})
                </Typography>
                <Stack spacing={1}>
                  {mission.submitted_this_task.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nothing submitted yet for this target.
                    </Typography>
                  ) : (
                    mission.submitted_this_task.map((resource) => (
                      <Paper key={resource.id} variant="outlined" sx={{ px: 1.5, py: 1.25 }}>
                        <Typography variant="subtitle2">{resource.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {resource.primary_category || 'uncategorized'} •{' '}
                          {resource.verification_status || 'pending'} •{' '}
                          {new Date(resource.created_at).toLocaleString()}
                        </Typography>
                      </Paper>
                    ))
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Container>
  )
}
