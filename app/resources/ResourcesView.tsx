'use client'

import { ResultsExplorer } from '@/components/search/ResultsExplorer'
import type { Resource, ResourceCategory } from '@/lib/types/database'
import type { ResourceMapItem } from '@/lib/api/resources'

interface ResourcesViewProps {
  resources: Resource[]
  mapResources?: ResourceMapItem[]
  categoryCounts?: Partial<Record<ResourceCategory, number>>
  search?: string
  isSearching: boolean
  isFiltering: boolean
  totalCount?: number
  currentPage?: number
  pageSize?: number
  intentLabel?: string | null
}

export function ResourcesView({
  resources,
  mapResources,
  categoryCounts,
  totalCount,
  currentPage,
  pageSize,
  intentLabel,
}: ResourcesViewProps) {
  return (
    <ResultsExplorer
      resources={resources}
      mapResources={mapResources}
      categoryCounts={categoryCounts}
      totalCount={totalCount ?? resources.length}
      currentPage={currentPage}
      pageSize={pageSize}
      intentLabel={intentLabel}
    />
  )
}
