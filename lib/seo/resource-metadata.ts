import type { Resource } from '@/lib/types/database'
import {
  getResourceAddressType,
  getServiceAreaHeading,
  getServiceAreaSummary,
} from '@/lib/utils/resource-location'

type MetadataResource = Pick<
  Resource,
  'name' | 'city' | 'state' | 'description' | 'primary_category'
> &
  Partial<Pick<Resource, 'address_type' | 'service_area'>>

export function getResourceMetadata(resource: MetadataResource) {
  const physical = getResourceAddressType(resource) === 'physical'
  const location = physical
    ? [resource.city, resource.state].filter(Boolean).join(', ') || undefined
    : getServiceAreaSummary(resource) || getServiceAreaHeading(resource) || undefined
  const title =
    physical && location
      ? `${resource.name} in ${location} | Reentry Map`
      : `${resource.name}${location ? ` | ${location}` : ''} | Reentry Map`
  const description =
    resource.description?.slice(0, 160) ||
    `Information about ${resource.name}${location ? ` — ${location}` : ''}. Contact the provider to confirm service and intake details.`.slice(
      0,
      160
    )
  return {
    title,
    description,
    location,
    keywords: [resource.name, location, resource.primary_category, 'reentry resources']
      .filter(Boolean)
      .join(', '),
  }
}
