'use client'

import React from 'react'
import {
  Box,
  Typography,
  Chip,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Rating,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import {
  Phone as PhoneIcon,
  Language as WebsiteIcon,
  Email as EmailIcon,
  Directions as DirectionsIcon,
  Verified as VerifiedIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import type { Resource } from '@/lib/types/database'

interface ResourceDetailProps {
  resource: Resource
}

export function ResourceDetail({ resource }: ResourceDetailProps) {
  const handleGetDirections = () => {
    const address = encodeURIComponent(resource.address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank')
  }

  const handleCall = () => {
    if (resource.phone) {
      window.location.href = `tel:${resource.phone}`
    }
  }

  const handleEmail = () => {
    if (resource.email) {
      window.location.href = `mailto:${resource.email}`
    }
  }

  const handleWebsite = () => {
    if (resource.website) {
      window.open(resource.website, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h3" component="h1" sx={{ flexGrow: 1 }}>
            {resource.name}
          </Typography>
          {resource.verified && (
            <Chip icon={<VerifiedIcon />} label="Verified" color="success" variant="outlined" />
          )}
        </Box>

        {/* Categories */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip label={resource.primary_category} color="primary" />
          {resource.categories &&
            resource.categories
              .filter((cat) => cat !== resource.primary_category)
              .map((category) => <Chip key={category} label={category} variant="outlined" />)}
        </Box>

        {/* Rating */}
        {resource.rating_average !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating value={resource.rating_average} precision={0.5} readOnly />
            <Typography variant="body2" color="text.secondary">
              {resource.rating_average.toFixed(1)} ({resource.rating_count} review
              {resource.rating_count !== 1 ? 's' : ''})
            </Typography>
          </Box>
        )}
      </Box>

      {/* Description */}
      {resource.description && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              About
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {resource.description}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Services Offered */}
      {resource.services_offered && resource.services_offered.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Services Offered
            </Typography>
            <List dense>
              {resource.services_offered.map((service, index) => (
                <ListItem key={index}>
                  <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                  <ListItemText primary={service} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Contact Information
          </Typography>
          <Stack spacing={2}>
            {/* Phone */}
            {resource.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon color="action" />
                <Typography variant="body1" sx={{ flexGrow: 1 }}>
                  {resource.phone}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PhoneIcon />}
                  onClick={handleCall}
                >
                  Call
                </Button>
              </Box>
            )}

            {/* Email */}
            {resource.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon color="action" />
                <Typography variant="body1" sx={{ flexGrow: 1 }}>
                  {resource.email}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EmailIcon />}
                  onClick={handleEmail}
                >
                  Email
                </Button>
              </Box>
            )}

            {/* Website */}
            {resource.website && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WebsiteIcon color="action" />
                <Typography
                  variant="body1"
                  sx={{
                    flexGrow: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {resource.website}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<WebsiteIcon />}
                  onClick={handleWebsite}
                >
                  Visit
                </Button>
              </Box>
            )}

            <Divider />

            {/* Address */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Address
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {resource.address}
                {resource.zip && ` ${resource.zip}`}
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<DirectionsIcon />}
                onClick={handleGetDirections}
                fullWidth
              >
                Get Directions
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Hours & Details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Details
          </Typography>
          <Stack spacing={2}>
            {/* Hours */}
            {resource.hours && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ScheduleIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2">Hours of Operation</Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="pre"
                  sx={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}
                >
                  {typeof resource.hours === 'string'
                    ? resource.hours
                    : JSON.stringify(resource.hours, null, 2)}
                </Typography>
              </Box>
            )}

            {/* Appointment Required */}
            {resource.appointment_required !== null && (
              <Alert severity={resource.appointment_required ? 'info' : 'success'} icon={false}>
                <Typography variant="body2">
                  {resource.appointment_required ? '📅 Appointment required' : '✓ Walk-ins welcome'}
                </Typography>
              </Alert>
            )}

            {/* Accepts Records */}
            {resource.accepts_records !== null && (
              <Alert severity={resource.accepts_records ? 'success' : 'warning'} icon={false}>
                <Typography variant="body2">
                  {resource.accepts_records
                    ? '✓ Accepts individuals with criminal records'
                    : '⚠️ May have restrictions for individuals with criminal records'}
                </Typography>
              </Alert>
            )}

            {/* Eligibility Requirements */}
            {resource.eligibility_requirements && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Eligibility Requirements
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {resource.eligibility_requirements}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Tags */}
      {resource.tags && resource.tags.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Tags
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {resource.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default ResourceDetail
