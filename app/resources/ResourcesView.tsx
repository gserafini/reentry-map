'use client'

import { Box, Typography, Alert, Button, Stack } from '@mui/material'
import { SearchOff as SearchOffIcon } from '@mui/icons-material'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ResourceList } from '@/components/resources/ResourceList'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { NearMeButton } from '@/components/search/NearMeButton'
import { DistanceFilter } from '@/components/search/DistanceFilter'
import { ResourceMap } from '@/components/map'
import { useUserLocation } from '@/lib/context/LocationContext'
import type { Resource, ResourceCategory } from '@/lib/types/database'

interface ResourcesViewProps {
  resources: Resource[]
  categoryCounts?: Partial<Record<ResourceCategory, number>>
  search?: string
  isSearching: boolean
  isFiltering: boolean
}

/**
 * Client component for resources page that shows map and list
 */
export function ResourcesView({
  resources,
  categoryCounts,
  search,
  isSearching,
  isFiltering,
}: ResourcesViewProps) {
  const { coordinates: gpsCoordinates } = useUserLocation()
  const searchParams = useSearchParams()
  const hasResults = resources && resources.length > 0

  // Get location from URL params (manual search) or GPS
  // URL params take priority so map re-centers when user searches for a location
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
  const coordinates =
    latParam && lngParam
      ? { latitude: parseFloat(latParam), longitude: parseFloat(lngParam) }
      : gpsCoordinates

  // Get radius from URL params
  const distanceParam = searchParams.get('distance')
  const radiusMiles = distanceParam ? parseInt(distanceParam, 10) : undefined

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Map at top */}
      <Box
        sx={{
          width: '100%',
          height: { xs: '400px', md: '500px' },
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <ResourceMap
          resources={resources}
          userLocation={
            coordinates
              ? {
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                }
              : null
          }
          radiusMiles={radiusMiles}
          height="100%"
        />
      </Box>

      {/* Filters and List */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Sidebar */}
        <Box sx={{ width: { xs: '100%', md: '300px' }, flexShrink: 0 }}>
          <Stack spacing={2}>
            {/* Near Me Button */}
            <NearMeButton />

            {/* Distance Filter */}
            <DistanceFilter hasLocation={!!coordinates} defaultDistance={25} />

            {/* Category Filter */}
            <CategoryFilter categoryCounts={categoryCounts} />
          </Stack>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Results count */}
          {hasResults && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {resources.length} resource{resources.length !== 1 ? 's' : ''}
              {isFiltering && ` in selected categories`}
            </Typography>
          )}

          {/* No results state */}
          {!hasResults && (isSearching || isFiltering) && (
            <Alert
              severity="info"
              icon={<SearchOffIcon />}
              sx={{ mb: 3 }}
              action={
                <Link href="/resources" style={{ textDecoration: 'none' }}>
                  <Button color="inherit" size="small">
                    Clear Filters
                  </Button>
                </Link>
              }
            >
              <Typography variant="subtitle2" gutterBottom>
                No results found
                {isSearching && ` for \u201C${search}"`}
                {isFiltering && ` in selected categories`}
              </Typography>
              <Typography variant="body2">
                Try adjusting your filters or browse all resources.
              </Typography>
            </Alert>
          )}

          {/* Resource List */}
          <ResourceList resources={resources} />
        </Box>
      </Box>
    </Box>
  )
}
