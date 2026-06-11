export const ADDRESS_TYPES = ['physical', 'confidential', 'regional', 'online', 'mobile'] as const

export type ResourceAddressType = (typeof ADDRESS_TYPES)[number]

export interface ServiceArea {
  type: string
  values: string[]
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
