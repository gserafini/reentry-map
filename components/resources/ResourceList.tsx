'use client'

import React from 'react'
import ResourceCard, { type ResourceCardResource } from '@/components/resources/ResourceCard'

interface ResourceListProps {
  // Accept a loose resource shape here since data may be partially populated
  resources: Partial<ResourceCardResource>[]
  onFavorite?: (id?: string) => void
  userLocation?: { lat: number; lng: number }
}

export function ResourceList({ resources, onFavorite, userLocation }: ResourceListProps) {
  if (!resources || resources.length === 0) {
    return (
      <div role="status" aria-live="polite" className="p-6 text-center text-gray-600">
        No resources found
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="resource-list"
    >
      {resources.map((r) => {
        // ensure name exists for key and props
        const key = r.id ?? r.name ?? Math.random().toString(36).slice(2, 9)

        const resourceObj: ResourceCardResource = {
          name: r.name ?? 'Unknown',
          id: r.id,
          primary_category: r.primary_category ?? null,
          address: r.address ?? null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          rating_average: r.rating_average ?? null,
          rating_count: r.rating_count ?? null,
          website: r.website ?? null,
        }

        return (
          <ResourceCard
            key={String(key)}
            resource={resourceObj}
            onFavorite={onFavorite}
            userLocation={userLocation}
          />
        )
      })}
    </div>
  )
}

export default ResourceList
