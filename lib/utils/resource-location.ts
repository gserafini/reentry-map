export const ADDRESS_TYPES = ['physical', 'confidential', 'regional', 'online', 'mobile'] as const

export type ResourceAddressType = (typeof ADDRESS_TYPES)[number]

export interface ServiceArea {
  type: string
  values: string[]
}

const ADDRESS_TYPE_SET = new Set<string>(ADDRESS_TYPES)
const SERVICE_AREA_TYPES = new Set<ResourceAddressType>(['regional', 'online', 'mobile'])

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
