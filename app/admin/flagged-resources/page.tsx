'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material'
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'

interface FlaggedResource {
  id: string
  name: string
  address: string
  city: string | null
  state: string | null
  website: string | null
  phone: string | null
  status: string
  admin_notes: string | null
  created_at: string

  // Latest verification log
  verification_log?: {
    overall_score: number
    decision_reason: string
    checks_performed: Record<string, unknown>
    conflicts_found: unknown[]
    created_at: string
  }
}

export default function AdminFlaggedResourcesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [resources, setResources] = useState<FlaggedResource[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedResource, setSelectedResource] = useState<FlaggedResource | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!authLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/admin/flagged-resources')
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

  // Fetch flagged resources
  useEffect(() => {
    async function fetchResources() {
      if (!isAdmin) return

      setLoading(true)
      try {
        // Fetch resource_suggestions that were flagged
        const params = new URLSearchParams({
          status: statusFilter,
        })

        const response = await fetch(`/api/admin/flagged-resources?${params}`)
        const result = (await response.json()) as { data: FlaggedResource[] }

        setResources(result.data || [])
      } catch (error) {
        console.error('Error fetching flagged resources:', error)
      }
      setLoading(false)
    }

    if (isAdmin && !checkingAdmin) {
      fetchResources()
    }
  }, [isAdmin, checkingAdmin, statusFilter])

  const handleApprove = async (resource: FlaggedResource) => {
    setApproving(true)
    try {
      const response = await fetch(`/api/admin/flagged-resources/${resource.id}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        // Remove from list
        setResources(resources.filter((r) => r.id !== resource.id))
        setDetailsDialogOpen(false)
      } else {
        alert('Failed to approve resource')
      }
    } catch (error) {
      console.error('Error approving resource:', error)
      alert('Failed to approve resource')
    }
    setApproving(false)
  }

  const handleReject = async (resource: FlaggedResource) => {
    setRejecting(true)
    try {
      const response = await fetch(`/api/admin/flagged-resources/${resource.id}/reject`, {
        method: 'POST',
      })

      if (response.ok) {
        // Remove from list
        setResources(resources.filter((r) => r.id !== resource.id))
        setDetailsDialogOpen(false)
      } else {
        alert('Failed to reject resource')
      }
    } catch (error) {
      console.error('Error rejecting resource:', error)
      alert('Failed to reject resource')
    }
    setRejecting(false)
  }

  const openDetails = (resource: FlaggedResource) => {
    setSelectedResource(resource)
    setDetailsDialogOpen(true)
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

  if (!isAdmin) return null

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Flagged Resources for Review
        </Typography>
        <Button variant="outlined" onClick={() => router.push('/admin')}>
          Back to Admin
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        These resources were flagged by the autonomous verification system and require human review
        before publication.
      </Alert>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="pending">Pending Review</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Results Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {resources.length} flagged resource{resources.length !== 1 ? 's' : ''}
      </Typography>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : resources.length === 0 ? (
        <Alert severity="success">
          No resources flagged for review! All submissions are being auto-approved or rejected.
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Verification Score</TableCell>
                  <TableCell>Flag Reason</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {resource.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {[resource.address, resource.city, resource.state]
                          .filter(Boolean)
                          .join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{resource.phone || '-'}</Typography>
                      {resource.website && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          <a href={resource.website} target="_blank" rel="noopener noreferrer">
                            Website
                          </a>
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {resource.verification_log ? (
                        <Chip
                          label={`${(resource.verification_log.overall_score * 100).toFixed(0)}%`}
                          size="small"
                          color={
                            resource.verification_log.overall_score >= 0.7
                              ? 'success'
                              : resource.verification_log.overall_score >= 0.5
                                ? 'warning'
                                : 'error'
                          }
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ maxWidth: 200, display: 'block' }}
                      >
                        {resource.admin_notes ||
                          resource.verification_log?.decision_reason ||
                          'No reason provided'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(resource.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openDetails(resource)}
                        title="View details"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleApprove(resource)}
                        title="Approve"
                      >
                        <ApproveIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleReject(resource)}
                        title="Reject"
                      >
                        <RejectIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedResource && (
          <>
            <DialogTitle>{selectedResource.name}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2">Address</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedResource.address}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedResource.city}, {selectedResource.state}
                  </Typography>
                </Box>

                {selectedResource.verification_log && (
                  <>
                    <Box>
                      <Typography variant="subtitle2">Verification Score</Typography>
                      <Chip
                        label={`${(selectedResource.verification_log.overall_score * 100).toFixed(0)}%`}
                        color={
                          selectedResource.verification_log.overall_score >= 0.7
                            ? 'success'
                            : selectedResource.verification_log.overall_score >= 0.5
                              ? 'warning'
                              : 'error'
                        }
                        sx={{ mt: 1 }}
                      />
                    </Box>

                    <Box>
                      <Typography variant="subtitle2">Flag Reason</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedResource.verification_log.decision_reason}
                      </Typography>
                    </Box>

                    {selectedResource.verification_log.conflicts_found?.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2">Conflicts Detected</Typography>
                        {(
                          selectedResource.verification_log.conflicts_found as Array<
                            Record<string, string>
                          >
                        ).map((conflict: Record<string, string>, idx: number) => (
                          <Alert severity="warning" key={idx} sx={{ mt: 1 }}>
                            <strong>{conflict.field}:</strong> Submitted &quot;
                            {conflict.submitted}&quot; but found &quot;{conflict.found}&quot; from{' '}
                            {conflict.source}
                          </Alert>
                        ))}
                      </Box>
                    )}

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">Verification Details</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                          {JSON.stringify(
                            selectedResource.verification_log.checks_performed,
                            null,
                            2
                          )}
                        </pre>
                      </AccordionDetails>
                    </Accordion>
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleReject(selectedResource)}
                disabled={rejecting}
              >
                {rejecting ? <CircularProgress size={20} /> : 'Reject'}
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleApprove(selectedResource)}
                disabled={approving}
              >
                {approving ? <CircularProgress size={20} /> : 'Approve & Publish'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  )
}
