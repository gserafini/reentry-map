'use client'

import React from 'react'
import { Card, CardHeader, CardBody, CardFooter, Badge, Button } from '@heroui/react'
import type { Resource } from '@/lib/types/database'

export type ResourceCardResource = {
  id?: string
  name: string
  primary_category?: string | null
  address?: string | null
  rating_average?: number | null
  rating_count?: number | null
  latitude?: number | null
  longitude?: number | null
  website?: string | null
}

interface ResourceCardProps {
  resource: ResourceCardResource | Resource
  onFavorite?: (id?: string) => void
  userLocation?: { lat: number; lng: number }
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 3958.8 // miles
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const aHarv = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(toRad(b.lat))
  const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv))
  return R * c
}

export function ResourceCard({ resource, onFavorite, userLocation }: ResourceCardProps) {
  const distance =
    resource.latitude != null && resource.longitude != null && userLocation
      ? haversineDistance({ lat: resource.latitude, lng: resource.longitude }, userLocation)
      : null

  return (
    <Card data-testid="resource-card">
      <CardHeader>
        <div className="flex w-full items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{resource.name}</h3>
            {resource.primary_category && (
              <Badge data-testid="category-badge" className="mt-1">
                {resource.primary_category}
              </Badge>
            )}
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">
              {resource.rating_average != null ? resource.rating_average.toFixed(1) : '-'}
              {resource.rating_count ? ` (${resource.rating_count})` : ''}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <p className="text-sm text-gray-700" data-testid="resource-address">
          {resource.address ?? 'No address'}
        </p>
        {distance !== null && (
          <p className="mt-2 text-sm text-gray-500" data-testid="resource-distance">
            {distance.toFixed(1)} mi
          </p>
        )}
      </CardBody>

      <CardFooter>
        <div className="flex w-full items-center justify-between">
          <Button
            aria-label={`Save ${resource.name}`}
            onClick={() => onFavorite?.(resource.id)}
            size="sm"
          >
            Save
          </Button>
          {resource.website ? (
            <a
              href={resource.website}
              className="text-sm text-primary-600"
              aria-label={`Visit ${resource.name} website`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Website
            </a>
          ) : (
            <span className="text-sm text-gray-400">No website</span>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

export default ResourceCard
