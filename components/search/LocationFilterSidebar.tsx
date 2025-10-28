'use client'

import { Card, CardContent } from '@mui/material'
import { DistanceFilter } from './DistanceFilter'
import { useUserLocation } from '@/lib/context/LocationContext'

interface LocationFilterSidebarProps {
  /**
   * Optional additional filters to display
   */
  children?: React.ReactNode
}

/**
 * Location filter sidebar component
 *
 * Provides distance radius slider when user location is available
 * Can be combined with other filters (categories, etc.)
 */
export function LocationFilterSidebar({ children }: LocationFilterSidebarProps) {
  const { coordinates } = useUserLocation()
  const hasLocation = Boolean(coordinates)

  return (
    <>
      {/* Location/Distance Filter */}
      {hasLocation && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <DistanceFilter hasLocation={hasLocation} defaultDistance={25} />
          </CardContent>
        </Card>
      )}

      {/* Other filters */}
      {children}
    </>
  )
}
