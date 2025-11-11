'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Card,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Tooltip,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Public as PublicIcon,
  Schedule as ScheduleIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'

interface ProvenanceData {
  // Discovery info
  discovered: {
    by: string // 'claude_web' | 'claude_code' | 'human' | etc
    method: string // '211_database' | 'web_search' | 'user_submission'
    source_url?: string
    discovered_date: string
  }

  // Verification info
  verified: {
    initial_verification?: {
      date: string
      confidence: number
      auto_approved: boolean
      checks_passed: number
      total_checks: number
    }
    last_verification?: {
      date: string
      confidence: number
      next_check_date?: string
    }
  }

  // Field-level verification
  fields?: {
    [fieldName: string]: {
      verified: boolean
      verified_date: string
      method: string
      confidence: number
      next_check: string
    }
  }
}

interface ResourceProvenanceProps {
  provenance?: ProvenanceData | null
  created_at?: string
  verification_status?: string
  verification_confidence?: number
  last_verified_at?: string
  next_verification_at?: string
}

export function ResourceProvenance({
  provenance,
  created_at: _created_at,
  verification_status,
  verification_confidence,
  last_verified_at,
  next_verification_at,
}: ResourceProvenanceProps) {
  const [expanded, setExpanded] = useState(false)

  // Don't show if no provenance data
  if (!provenance && !verification_status) {
    return null
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified':
        return 'success'
      case 'flagged':
        return 'warning'
      case 'pending':
        return 'default'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircleIcon fontSize="small" />
      case 'flagged':
        return <WarningIcon fontSize="small" />
      default:
        return <InfoIcon fontSize="small" />
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <PublicIcon color="action" />
            <Box>
              <Typography variant="subtitle2">Data Quality & Provenance</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {verification_status && (
                  <Chip
                    icon={getStatusIcon(verification_status)}
                    label={`${verification_status.charAt(0).toUpperCase()}${verification_status.slice(1)}`}
                    size="small"
                    color={getStatusColor(verification_status)}
                  />
                )}
                {verification_confidence !== undefined && (
                  <Chip
                    label={`${(verification_confidence * 100).toFixed(0)}% Confidence`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {last_verified_at && (
                  <Chip
                    icon={<ScheduleIcon />}
                    label={`Verified ${formatDate(last_verified_at)}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        </AccordionSummary>

        <AccordionDetails>
          <Stack spacing={3}>
            {/* Discovery Information */}
            {provenance?.discovered && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  📍 Discovery
                </Typography>
                <Stack spacing={1} sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Discovered by:</strong> {provenance.discovered.by}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Method:</strong> {provenance.discovered.method}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>When:</strong> {formatDate(provenance.discovered.discovered_date)}
                  </Typography>
                  {provenance.discovered.source_url && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Source:</strong>{' '}
                      <a
                        href={provenance.discovered.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {provenance.discovered.source_url}
                      </a>
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            {/* Initial Verification */}
            {provenance?.verified?.initial_verification && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  ✅ Initial Verification
                </Typography>
                <Stack spacing={1} sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Verified:</strong>{' '}
                    {formatDate(provenance.verified.initial_verification.date)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Confidence:</strong>{' '}
                    {(provenance.verified.initial_verification.confidence * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Checks Passed:</strong>{' '}
                    {provenance.verified.initial_verification.checks_passed}/
                    {provenance.verified.initial_verification.total_checks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Auto-approved:</strong>{' '}
                    {provenance.verified.initial_verification.auto_approved
                      ? 'Yes'
                      : 'No (human reviewed)'}
                  </Typography>
                </Stack>
              </Box>
            )}

            {/* Last Verification */}
            {last_verified_at && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  🔄 Recent Verification
                </Typography>
                <Stack spacing={1} sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last checked:</strong> {formatDate(last_verified_at)}
                  </Typography>
                  {verification_confidence !== undefined && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Current confidence:</strong>{' '}
                      {(verification_confidence * 100).toFixed(0)}%
                    </Typography>
                  )}
                  {next_verification_at && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Next check:</strong> {formatDate(next_verification_at)}
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            {/* Field-Level Verification */}
            {provenance?.fields && Object.keys(provenance.fields).length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  📋 Field-Level Verification
                </Typography>
                <Stack spacing={1} sx={{ pl: 2 }}>
                  {Object.entries(provenance.fields).map(([fieldName, fieldData]) => (
                    <Box key={fieldName}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title={`Verified via ${fieldData.method}`}>
                          <Chip
                            icon={fieldData.verified ? <VerifiedIcon /> : <WarningIcon />}
                            label={fieldName.replace(/_/g, ' ')}
                            size="small"
                            color={fieldData.verified ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </Tooltip>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(fieldData.verified_date)} · Next:{' '}
                          {formatDate(fieldData.next_check)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Trust Badge */}
            <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                This resource has been verified using autonomous AI verification with adversarial
                checking. Data quality is continuously monitored and updated.
              </Typography>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Card>
  )
}
