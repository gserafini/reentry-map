'use client'

import { Box, Typography } from '@mui/material'
import { useSearchParams } from 'next/navigation'
import { useUserLocation } from '@/lib/context/LocationContext'
import { resolveVisibleLocationName } from '@/lib/utils/location-scope'

interface SearchPageHeaderProps {
  /**
   * The search query from URL params
   */
  search?: string
}

/**
 * Search page header with dynamic location display
 * Client component to access LocationContext
 */
export function SearchPageHeader({ search }: SearchPageHeaderProps) {
  const searchParams = useSearchParams()
  const { displayName } = useUserLocation()
  const locationName = searchParams.get('locationName')
  const visibleLocationName = resolveVisibleLocationName(locationName, displayName)
  const isSearching = Boolean(search && search.trim())

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        {isSearching ? <>Search Results: &ldquo;{search}&rdquo;</> : 'Search Resources'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {isSearching ? (
          <>
            Showing results for &ldquo;{search}&rdquo;
            {visibleLocationName && ` near ${visibleLocationName}`}
          </>
        ) : (
          'Find employment, housing, food, healthcare, and support services in your community. Browse our directory of verified resources.'
        )}
      </Typography>
    </Box>
  )
}
