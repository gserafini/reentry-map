'use client'

import { useState, useEffect } from 'react'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import type { Resource, AIAgentLog } from '@/lib/types/database'

interface AdminResourceMetadataProps {
  resource: Resource
}

interface AILogResponse {
  logs: AIAgentLog[]
}

/**
 * Admin-only component showing complete resource metadata
 * Displays AI processing history, verification status, data quality metrics, and change logs
 */
export function AdminResourceMetadata({ resource }: AdminResourceMetadataProps) {
  const [aiLogs, setAiLogs] = useState<AIAgentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch AI agent logs on mount
  useEffect(() => {
    async function fetchAiLogs() {
      try {
        const response = await fetch(`/api/admin/resources/${resource.id}/ai-logs`)

        // Handle authorization errors gracefully - just means no logs available
        if (response.status === 401 || response.status === 403) {
          setAiLogs([])
          setLoading(false)
          return
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch AI logs: ${response.status} ${response.statusText}`)
        }

        const data = (await response.json()) as AILogResponse
        setAiLogs(data.logs || [])
      } catch (err) {
        console.error('Error fetching AI logs:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAiLogs()
  }, [resource.id])

  // Format timestamp
  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format currency (cost is stored as decimal dollars, not cents)
  const formatCurrency = (cost: number | null | undefined) => {
    if (cost === null || cost === undefined) return 'N/A'
    return `$${cost.toFixed(4)}`
  }

  // Format duration
  const formatDuration = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Admin-Only Metadata
        </Typography>
        <Typography variant="body2">
          This section is only visible to administrators and contains complete resource metadata
          including AI processing history, verification status, and internal data quality metrics.
        </Typography>
      </Alert>

      {/* Verification */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Verification Status</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Verified Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {resource.verified ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <CancelIcon color="error" />
                )}
                <Typography>{resource.verified ? 'Verified' : 'Not Verified'}</Typography>
              </Box>
            </Box>
            {resource.verified_by && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Verified By
                </Typography>
                <Typography>{resource.verified_by}</Typography>
              </Box>
            )}
            {resource.verified_date && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Verified Date
                </Typography>
                <Typography>{formatTimestamp(resource.verified_date)}</Typography>
              </Box>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* AI Processing */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">AI Processing</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                AI Discovered
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {resource.ai_discovered ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <CancelIcon color="disabled" />
                )}
                <Typography>{resource.ai_discovered ? 'Yes' : 'No'}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                AI Enriched
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {resource.ai_enriched ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <CancelIcon color="disabled" />
                )}
                <Typography>{resource.ai_enriched ? 'Yes' : 'No'}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                AI Last Verified
              </Typography>
              <Typography>{formatTimestamp(resource.ai_last_verified)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                AI Verification Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>
                  {resource.ai_verification_score
                    ? `${(resource.ai_verification_score * 100).toFixed(0)}%`
                    : 'N/A'}
                </Typography>
                {resource.ai_verification_score && resource.ai_verification_score >= 0.8 ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : resource.ai_verification_score && resource.ai_verification_score >= 0.5 ? (
                  <WarningIcon color="warning" fontSize="small" />
                ) : resource.ai_verification_score ? (
                  <CancelIcon color="error" fontSize="small" />
                ) : null}
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Data Quality */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Data Quality</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Data Completeness Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>
                  {resource.data_completeness_score
                    ? `${(resource.data_completeness_score * 100).toFixed(0)}%`
                    : 'N/A'}
                </Typography>
                {resource.data_completeness_score && resource.data_completeness_score >= 0.8 ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : resource.data_completeness_score && resource.data_completeness_score >= 0.5 ? (
                  <WarningIcon color="warning" fontSize="small" />
                ) : resource.data_completeness_score ? (
                  <CancelIcon color="error" fontSize="small" />
                ) : null}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Phone Verified
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {resource.phone_verified ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <CancelIcon color="error" />
                )}
                <Typography>{resource.phone_verified ? 'Yes' : 'No'}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Phone Last Verified
              </Typography>
              <Typography>{formatTimestamp(resource.phone_last_verified)}</Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Status & Moderation */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Status & Moderation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Status
              </Typography>
              <Chip
                label={resource.status || 'active'}
                color={
                  resource.status === 'active'
                    ? 'success'
                    : resource.status === 'inactive'
                      ? 'error'
                      : 'warning'
                }
                size="small"
              />
            </Box>
            {resource.status_reason && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Status Reason
                </Typography>
                <Typography>{resource.status_reason}</Typography>
              </Box>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Timestamps */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Timestamps</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Created At
              </Typography>
              <Typography>{formatTimestamp(resource.created_at)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Updated At
              </Typography>
              <Typography>{formatTimestamp(resource.updated_at)}</Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Change Log */}
      {resource.change_log && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Change Log</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.875rem',
              }}
            >
              {JSON.stringify(resource.change_log, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* AI Agent Logs */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">AI Agent Logs ({aiLogs.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : aiLogs.length === 0 ? (
            <Typography color="text.secondary">
              No AI agent logs found for this resource.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Agent</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell align="right">Confidence</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aiLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatTimestamp(log.created_at)}</TableCell>
                      <TableCell>
                        <Chip label={log.agent_type} size="small" />
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        {log.error_message ? (
                          <Chip label="Error" color="error" size="small" />
                        ) : (
                          <Chip label="Success" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {log.confidence_score
                          ? `${(log.confidence_score * 100).toFixed(0)}%`
                          : 'N/A'}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(log.cost)}</TableCell>
                      <TableCell align="right">{formatDuration(log.duration_ms)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}
