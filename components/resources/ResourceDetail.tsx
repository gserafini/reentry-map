'use client'

import React from 'react'
import Link from 'next/link'
import {
  Box,
  Typography,
  Chip,
  Button,
  Card,
  CardContent,
  Stack,
  Rating,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  Link as MuiLink,
} from '@mui/material'
import {
  Phone as PhoneIcon,
  Language as WebsiteIcon,
  Email as EmailIcon,
  Directions as DirectionsIcon,
  Verified as VerifiedIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material'
import type { Resource, ResourceCategory } from '@/lib/types/database'
import { SingleResourceMap } from '@/components/map'
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/category-icons'
import { getCategoryLabel } from '@/lib/utils/categories'

interface ResourceDetailProps {
  resource: Resource
}

export function ResourceDetail({ resource }: ResourceDetailProps) {
  const handleGetDirections = () => {
    const address = encodeURIComponent(resource.address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank')
  }

  return (
    <Box>
      {/* Map Section - Full width on mobile, contained on desktop */}
      <Paper
        elevation={2}
        sx={{
          mb: 4,
          overflow: 'hidden',
          borderRadius: { xs: 0, sm: 2 },
          mx: { xs: -2, sm: 0 },
        }}
      >
        <SingleResourceMap resource={resource} height="400px" showInfo={false} />
      </Paper>

      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{ flexGrow: 1, fontSize: { xs: '2rem', md: '3rem' } }}
          >
            {resource.name}
          </Typography>
          {resource.verified && (
            <Chip icon={<VerifiedIcon />} label="Verified" color="success" variant="outlined" />
          )}
        </Box>

        {/* Address with Get Directions button */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              flexGrow: 1,
              minWidth: '200px',
            }}
          >
            <LocationOnIcon color="action" sx={{ mt: 0.5 }} />
            <Typography variant="body1" color="text.secondary">
              {resource.address}
              {resource.zip && ` ${resource.zip}`}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<DirectionsIcon />}
            onClick={handleGetDirections}
            sx={{ flexShrink: 0 }}
          >
            Get Directions
          </Button>
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

      {/* Contact Information, Services & Details - 3 column layout on desktop, stacked on mobile */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        {/* Contact Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <Stack spacing={2}>
              {/* Phone */}
              {resource.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon color="action" />
                  <MuiLink
                    href={`tel:${resource.phone}`}
                    underline="hover"
                    color="inherit"
                    title={`Call ${resource.phone}`}
                    sx={{
                      flex: 1,
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    <Typography variant="body1">{resource.phone}</Typography>
                  </MuiLink>
                  <Button
                    component="a"
                    href={`tel:${resource.phone}`}
                    variant="outlined"
                    size="small"
                    startIcon={<PhoneIcon />}
                    title={`Call ${resource.phone}`}
                    sx={{ flexShrink: 0 }}
                  >
                    Call
                  </Button>
                </Box>
              )}

              {/* Email */}
              {resource.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon color="action" />
                  <MuiLink
                    href={`mailto:${resource.email}`}
                    underline="hover"
                    color="inherit"
                    title={`Email ${resource.email}`}
                    sx={{
                      flex: 1,
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    <Typography variant="body1">{resource.email}</Typography>
                  </MuiLink>
                  <Button
                    component="a"
                    href={`mailto:${resource.email}`}
                    variant="outlined"
                    size="small"
                    startIcon={<EmailIcon />}
                    title={`Email ${resource.email}`}
                    sx={{ flexShrink: 0 }}
                  >
                    Email
                  </Button>
                </Box>
              )}

              {/* Website */}
              {resource.website && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WebsiteIcon color="action" />
                  <MuiLink
                    href={resource.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    color="inherit"
                    title={`Visit ${resource.website}`}
                    sx={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {resource.website}
                    </Typography>
                  </MuiLink>
                  <Button
                    component="a"
                    href={resource.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                    startIcon={<WebsiteIcon />}
                    title={`Visit ${resource.website}`}
                    sx={{ flexShrink: 0 }}
                  >
                    Visit
                  </Button>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Services Offered */}
        {resource.services_offered && resource.services_offered.length > 0 && (
          <Card>
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

        {/* Hours & Details */}
        <Card>
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
                  {typeof resource.hours === 'string' ? (
                    <Typography variant="body2" color="text.secondary">
                      {resource.hours}
                    </Typography>
                  ) : (
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {Object.entries(resource.hours as Record<string, string>).map(
                        ([day, hours]) => (
                          <Typography
                            key={day}
                            component="li"
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 0.5 }}
                          >
                            <strong style={{ textTransform: 'capitalize' }}>{day}:</strong> {hours}
                          </Typography>
                        )
                      )}
                    </Box>
                  )}
                </Box>
              )}

              {/* Appointment Required */}
              {resource.appointment_required !== null && (
                <Alert severity={resource.appointment_required ? 'info' : 'success'} icon={false}>
                  <Typography variant="body2">
                    {resource.appointment_required
                      ? '📅 Appointment required'
                      : '✓ Walk-ins welcome'}
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
      </Box>

      {/* Categories */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Categories
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Link
            href={`/resources/category/${resource.primary_category}`}
            style={{ textDecoration: 'none' }}
          >
            <Chip
              icon={React.createElement(
                getCategoryIcon(resource.primary_category as ResourceCategory)
              )}
              label={getCategoryLabel(resource.primary_category as ResourceCategory)}
              clickable
              sx={{
                bgcolor: getCategoryColor(resource.primary_category as ResourceCategory),
                color: 'white',
                fontWeight: 600,
                px: 0.5,
                '& .MuiChip-icon': {
                  color: 'white',
                  fontSize: '1.1rem',
                },
                '&:hover': {
                  bgcolor: getCategoryColor(resource.primary_category as ResourceCategory),
                  opacity: 0.9,
                },
              }}
            />
          </Link>
          {resource.categories &&
            resource.categories
              .filter((cat) => cat !== resource.primary_category)
              .map((category) => {
                const CategoryIcon = getCategoryIcon(category as ResourceCategory)
                const categoryColor = getCategoryColor(category as ResourceCategory)
                return (
                  <Link
                    key={category}
                    href={`/resources/category/${category}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Chip
                      icon={<CategoryIcon />}
                      label={getCategoryLabel(category as ResourceCategory)}
                      clickable
                      sx={{
                        bgcolor: categoryColor,
                        color: 'white',
                        px: 0.5,
                        '& .MuiChip-icon': {
                          color: 'white',
                          fontSize: '1.1rem',
                        },
                        '&:hover': {
                          opacity: 0.9,
                        },
                      }}
                    />
                  </Link>
                )
              })}
        </Box>
      </Box>

      {/* Tags */}
      {resource.tags && resource.tags.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Tags
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {resource.tags.map((tag) => (
              <Link key={tag} href={`/resources/tag/${tag}`} style={{ textDecoration: 'none' }}>
                <Chip label={tag} size="small" variant="outlined" clickable />
              </Link>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default ResourceDetail
