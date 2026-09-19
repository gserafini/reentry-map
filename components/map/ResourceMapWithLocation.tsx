'use client'

import { useSearchParams, usePathname } from 'next/navigation'
import { ResourceMap } from './ResourceMap'
import type { Resource } from '@/lib/types/database'
import { resolveSearchLocation } from '@/lib/utils/search-location'

interface ResourceMapWithLocationProps {
  resources: Resource[]
  selectedResourceId?: string | null
  onResourceClick?: (resourceId: string) => void
  height?: string
  fitToResources?: boolean
}

export function ResourceMapWithLocation({
  resources,
  selectedResourceId,
  onResourceClick,
  height = '500px',
  fitToResources = false,
}: ResourceMapWithLocationProps) {
  const location = resolveSearchLocation(useSearchParams(), usePathname())
  return (
    <ResourceMap
      resources={resources}
      userLocation={fitToResources ? null : location.coordinates}
      radiusMiles={fitToResources ? undefined : location.radiusMiles}
      viewportBounds={location.viewportBounds}
      selectedResourceId={selectedResourceId}
      onResourceClick={onResourceClick}
      height={height}
      fitToResources={fitToResources || !location.coordinates}
    />
  )
}
