import { getServiceAreaSummary, shouldShowDirectionsForResource } from './resource-location'
import { getResourceUrl } from './resource-url'

export const SAVED_RESOURCES_KEY = 'reentry-map:saved-resources:v1'
export const MAX_SAVED_RESOURCES = 100

/** Public listing fields only; never persist account, report or session data. */
export interface SavedResourceInput {
  id?: string
  name: string
  description?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  address_type?: string | null
  addressType?: string | null
  service_area?: unknown
  serviceArea?: unknown
  city?: string | null
  state?: string | null
  zip?: string | null
  slug?: string | null
  services_offered?: string[] | null
  eligibility_requirements?: string | null
  appointment_required?: boolean | null
  verified_date?: string | null
  ai_last_verified?: string | null
}

export interface SavedResource {
  id: string
  name: string
  description: string
  phone: string
  website: string
  location: string
  eligibility: string
  intake: string
  checked: string
  url: string
  savedAt: string
}

export function safeWebsite(value: string | null | undefined): string {
  try {
    const url = new URL(value || '')
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
      ? url.href
      : ''
  } catch {
    return ''
  }
}

export function snapshotResource(
  id: string,
  resource: SavedResourceInput,
  savedAt = new Date().toISOString()
): SavedResource {
  const location = shouldShowDirectionsForResource(resource)
    ? [resource.address, resource.city, resource.state, resource.zip].filter(Boolean).join(', ')
    : getServiceAreaSummary(resource) || 'Contact provider for service area'
  return {
    id,
    name: resource.name,
    description: resource.services_offered?.length
      ? resource.services_offered.join(' · ')
      : resource.description || '',
    phone: resource.phone || '',
    website: safeWebsite(resource.website),
    location,
    eligibility:
      resource.eligibility_requirements || 'Contact the organization to check eligibility.',
    intake:
      resource.appointment_required === true
        ? 'Appointment required. Contact the organization to arrange intake.'
        : 'Contact the organization for intake, hours and availability.',
    checked: resource.verified_date || resource.ai_last_verified || '',
    url: getResourceUrl({ ...resource, id }),
    savedAt,
  }
}

const TEXT_FIELDS = [
  'id',
  'name',
  'description',
  'phone',
  'website',
  'location',
  'eligibility',
  'intake',
  'checked',
  'url',
  'savedAt',
] as const

export function parseSavedResources(raw: string | null): SavedResource[] {
  try {
    const value: unknown = JSON.parse(raw || 'null')
    if (!value || typeof value !== 'object') return []
    const cache = value as { version?: number; resources?: unknown }
    if (cache.version !== 1 || !Array.isArray(cache.resources)) return []
    const seen = new Set<string>()
    return cache.resources
      .filter((entry): entry is SavedResource => {
        if (!entry || typeof entry !== 'object') return false
        const record = entry as Record<string, unknown>
        if (
          !TEXT_FIELDS.every(
            (field) => typeof record[field] === 'string' && record[field].length <= 30000
          )
        )
          return false
        if (!record.id || !record.name || seen.has(record.id as string)) return false
        const path = record.url as string
        if (
          !path.startsWith('/') ||
          new URL(path, 'https://reentrymap.org').origin !== 'https://reentrymap.org'
        )
          return false
        seen.add(record.id as string)
        return true
      })
      .slice(0, MAX_SAVED_RESOURCES)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        phone: entry.phone,
        website: safeWebsite(entry.website),
        location: entry.location,
        eligibility: entry.eligibility,
        intake: entry.intake,
        checked: entry.checked,
        url: entry.url,
        savedAt: entry.savedAt,
      }))
  } catch {
    return []
  }
}

export function supportListText(resources: SavedResource[]): string {
  return [
    'My support list — Reentry Map',
    'Saved copies may be out of date. Contact each organization before visiting.',
    ...resources.map((resource) =>
      [
        resource.name,
        resource.description,
        resource.location,
        resource.phone ? 'Phone: ' + resource.phone : 'Phone not listed',
        resource.website ? 'Website: ' + resource.website : '',
        'Who this helps: ' + resource.eligibility,
        'Next step: ' + resource.intake,
        resource.checked ? 'Listing last checked: ' + resource.checked : 'Check date not listed',
        'Saved on: ' + resource.savedAt,
        'Listing: https://reentrymap.org' + resource.url,
      ]
        .filter(Boolean)
        .join('\n')
    ),
  ].join('\n\n')
}
