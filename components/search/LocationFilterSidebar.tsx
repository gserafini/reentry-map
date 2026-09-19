'use client'

import { Card, CardContent } from '@mui/material'
import { useSearchParams, usePathname } from 'next/navigation'
import { DistanceFilter } from './DistanceFilter'
import { resolveSearchLocation } from '@/lib/utils/search-location'

export function LocationFilterSidebar({ children }: { children?: React.ReactNode }) {
  const location = resolveSearchLocation(useSearchParams(), usePathname())
  return (
    <>
      {location.coordinates && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <DistanceFilter hasLocation defaultDistance={location.radiusMiles || 25} />
          </CardContent>
        </Card>
      )}
      {children}
    </>
  )
}
