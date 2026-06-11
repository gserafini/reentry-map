export const ADDRESS_TYPES = ['physical', 'confidential', 'regional', 'online', 'mobile'] as const

export type ResourceAddressType = (typeof ADDRESS_TYPES)[number]

export interface ServiceArea {
  type: string
  values: string[]
}

export interface ApproximateLocationPresentation {
  label: string
  radiusMeters: number
  zoom: number
}

const US_STATE_CODE_TO_NAME: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
}

const ADDRESS_TYPE_SET = new Set<string>(ADDRESS_TYPES)
const SERVICE_AREA_TYPES = new Set<ResourceAddressType>(['regional', 'online', 'mobile'])
const SPELLED_NUMBER_PREFIX = /^(one|two|three|four|five|six|seven|eight|nine|ten)\b/i

function normalizeAddressText(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ')
}

export function normalizeAddressType(value: unknown): ResourceAddressType {
  if (typeof value !== 'string') {
    return 'physical'
  }

  const normalized = value.trim().toLowerCase()
  return ADDRESS_TYPE_SET.has(normalized) ? (normalized as ResourceAddressType) : 'physical'
}

export function normalizeServiceArea(value: unknown): ServiceArea | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as { type?: unknown; values?: unknown }
  const type = typeof candidate.type === 'string' ? candidate.type.trim() : ''
  const values = Array.isArray(candidate.values)
    ? candidate.values
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : []

  if (!type || values.length === 0) {
    return null
  }

  return { type, values }
}

export function getResourceServiceArea(resource: {
  serviceArea?: unknown
  service_area?: unknown
}): ServiceArea | null {
  return normalizeServiceArea(resource.serviceArea ?? resource.service_area)
}

export function getResourceAddressType(resource: {
  addressType?: unknown
  address_type?: unknown
}): ResourceAddressType {
  return normalizeAddressType(resource.addressType ?? resource.address_type)
}

export function requiresStreetAddress(
  addressType: ResourceAddressType | string | null | undefined
): boolean {
  return normalizeAddressType(addressType) === 'physical'
}

export function requiresServiceArea(
  addressType: ResourceAddressType | string | null | undefined
): boolean {
  return SERVICE_AREA_TYPES.has(normalizeAddressType(addressType))
}

export function hasPlausibleStreetAddress(
  address: string | null | undefined,
  city?: string | null,
  state?: string | null
): boolean {
  const normalizedAddress = normalizeAddressText(address)
  if (!normalizedAddress) {
    return false
  }

  const normalizedCity = normalizeAddressText(city)
  const normalizedState = normalizeAddressText(state)

  const localityOnlyValues = new Set(
    [
      normalizedCity,
      normalizedState,
      [normalizedCity, normalizedState].filter(Boolean).join(' '),
      [normalizedCity, normalizedState].filter(Boolean).join(', '),
    ].filter(Boolean)
  )

  if (localityOnlyValues.has(normalizedAddress)) {
    return false
  }

  return /\d/.test(normalizedAddress) || SPELLED_NUMBER_PREFIX.test(normalizedAddress)
}

export function needsPhysicalAddressReview(resource: {
  addressType?: string | null
  address_type?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}): boolean {
  return (
    requiresStreetAddress(resource.addressType ?? resource.address_type) &&
    !hasPlausibleStreetAddress(resource.address, resource.city, resource.state)
  )
}

export function buildGeocodingAddress(resource: {
  addressType?: string | null
  address_type?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}): string | null {
  const addressType = normalizeAddressType(resource.addressType ?? resource.address_type)
  const address = typeof resource.address === 'string' ? resource.address.trim() : ''
  const city = typeof resource.city === 'string' ? resource.city.trim() : ''
  const state = typeof resource.state === 'string' ? resource.state.trim() : ''
  const zip = typeof resource.zip === 'string' ? resource.zip.trim() : ''

  if (addressType === 'physical') {
    if (!hasPlausibleStreetAddress(address, city, state)) {
      return null
    }

    return [address, city, state, zip].filter(Boolean).join(', ')
  }

  if (!city || !state) {
    return null
  }

  return [city, state].join(', ')
}

function expandStateCode(state?: string | null): string | null {
  if (!state) return null
  return US_STATE_CODE_TO_NAME[state.toUpperCase()] || state
}

export function getApproximateLocationPresentation(resource: {
  addressType?: string | null
  address_type?: string | null
  serviceArea?: unknown
  service_area?: unknown
}): ApproximateLocationPresentation | null {
  const addressType = getResourceAddressType(resource)

  if (addressType === 'physical') {
    return null
  }

  const serviceAreaType = (getResourceServiceArea(resource)?.type || 'city').toLowerCase()

  switch (serviceAreaType) {
    case 'county':
      return { label: 'Approximate county-level location', radiusMeters: 20000, zoom: 9 }
    case 'region':
      return { label: 'Approximate regional location', radiusMeters: 45000, zoom: 8 }
    case 'statewide':
      return { label: 'Approximate statewide anchor location', radiusMeters: 120000, zoom: 7 }
    case 'nationwide':
      return { label: 'Approximate anchor location', radiusMeters: 250000, zoom: 5 }
    case 'city':
    default:
      return {
        label: 'Approximate city-level location',
        radiusMeters: 10000,
        zoom: 10,
      }
  }
}

export function getServiceAreaHeading(resource: {
  addressType?: string | null
  address_type?: string | null
  serviceArea?: unknown
  service_area?: unknown
}): string | null {
  const addressType = getResourceAddressType(resource)
  const serviceAreaType = (getResourceServiceArea(resource)?.type || '').toLowerCase()

  if (addressType === 'physical') return null
  if (addressType === 'confidential') return 'Confidential location'

  switch (serviceAreaType) {
    case 'statewide':
      return 'Statewide resource'
    case 'nationwide':
      return 'Nationwide resource'
    case 'county':
      return 'Countywide resource'
    case 'city':
      return 'Citywide resource'
    default:
      return addressType === 'online'
        ? 'Online resource'
        : addressType === 'mobile'
          ? 'Mobile resource'
          : 'Regional resource'
  }
}

export function getServiceAreaSummary(resource: {
  addressType?: string | null
  address_type?: string | null
  serviceArea?: unknown
  service_area?: unknown
  city?: string | null
  state?: string | null
}): string | null {
  const addressType = getResourceAddressType(resource)
  const serviceArea = getResourceServiceArea(resource)
  const stateName = expandStateCode(resource.state)

  if (addressType === 'confidential') {
    return stateName && resource.city
      ? `Location withheld; contact provider for meeting details in ${resource.city}, ${stateName}`
      : 'Location withheld; contact provider for meeting details'
  }

  if (!serviceArea) return null

  const values = serviceArea.values
  const serviceAreaType = serviceArea.type.toLowerCase()

  switch (serviceAreaType) {
    case 'statewide':
      return stateName ? `Serves all of ${stateName}` : `Serves all of ${values.join(', ')}`
    case 'nationwide':
      return 'Serves people nationwide'
    case 'city':
      return values.length === 1 ? `Serves the ${values[0]} area` : `Serves ${values.join(', ')}`
    case 'county':
    case 'region':
    default:
      return `Serves ${values.join(', ')}`
  }
}

export function shouldShowDirectionsForResource(resource: {
  addressType?: string | null
  address_type?: string | null
}): boolean {
  return getResourceAddressType(resource) === 'physical'
}
