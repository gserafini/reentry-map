import type { Json, Resource } from '@/lib/types/database'
import {
  generateCitySlug,
  generateResourceSlug,
  generateStateSlug,
  parseCitySlug,
} from '@/lib/utils/urls'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UNSAFE_CITY_CHARACTERS = /[\/\\?#%\u0000-\u001f\u007f-\u009f]/

export type ResourceMergeSource = Pick<Resource, 'id' | 'status'> & {
  provenance?: Json | null
}

export type ResourceMergeTarget = Pick<Resource, 'id' | 'name' | 'city' | 'state' | 'status'> & {
  provenance?: Json | null
}

export type ResourceSlugPeer = Pick<Resource, 'id' | 'name' | 'city' | 'state' | 'status'>

function isJsonObject(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Return the explicit duplicate target only for inactive rows; parentResourceId has other uses. */
export function getDuplicateCanonicalResourceId(resource: ResourceMergeSource): string | null {
  if (resource.status !== 'inactive' || !UUID_PATTERN.test(resource.id)) return null

  const provenance = isJsonObject(resource.provenance) ? resource.provenance : undefined
  const duplicateMerge = isJsonObject(provenance?.duplicate_merge)
    ? provenance.duplicate_merge
    : undefined
  const canonicalId = duplicateMerge?.canonical_resource_id

  if (
    typeof canonicalId !== 'string' ||
    !UUID_PATTERN.test(canonicalId) ||
    canonicalId.toLowerCase() === resource.id.toLowerCase()
  ) {
    return null
  }

  return canonicalId
}

/** Build a local URL only when the explicit target is a different active resource. */
export function getDuplicateCanonicalResourceUrl(
  resource: ResourceMergeSource,
  canonical: ResourceMergeTarget | null | undefined,
  activeCityPeers: ResourceSlugPeer[]
): string | null {
  const canonicalId = getDuplicateCanonicalResourceId(resource)
  if (
    !canonicalId ||
    !canonical ||
    canonical.status !== 'active' ||
    canonical.id.toLowerCase() !== canonicalId.toLowerCase()
  ) {
    return null
  }

  const canonicalProvenance = isJsonObject(canonical.provenance) ? canonical.provenance : undefined
  const canonicalMerge = isJsonObject(canonicalProvenance?.duplicate_merge)
    ? canonicalProvenance.duplicate_merge
    : undefined
  const reverseCanonicalId = canonicalMerge?.canonical_resource_id
  if (
    typeof reverseCanonicalId === 'string' &&
    reverseCanonicalId.toLowerCase() === resource.id.toLowerCase()
  ) {
    return null
  }

  if (
    typeof canonical.state !== 'string' ||
    !/^[A-Z]{2}$/.test(canonical.state) ||
    typeof canonical.city !== 'string' ||
    !canonical.city.trim() ||
    UNSAFE_CITY_CHARACTERS.test(canonical.city) ||
    typeof canonical.name !== 'string'
  ) {
    return null
  }

  const citySlug = generateCitySlug(canonical.city.trim())
  if (parseCitySlug(citySlug).toLowerCase() !== canonical.city.toLowerCase()) return null

  const segments = [
    generateStateSlug(canonical.state),
    citySlug,
    generateResourceSlug(canonical.name),
  ]
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        /[/?#\\\u0000-\u001f\u007f-\u009f]/.test(segment)
    )
  ) {
    return null
  }

  const canonicalCity = canonical.city.trim().toLowerCase()
  const canonicalState = canonical.state.toUpperCase()
  const matchingPeers = activeCityPeers.filter(
    (peer) =>
      peer.status === 'active' &&
      peer.city?.trim().toLowerCase() === canonicalCity &&
      peer.state?.toUpperCase() === canonicalState &&
      generateResourceSlug(peer.name) === segments[2]
  )
  if (
    matchingPeers.length !== 1 ||
    matchingPeers[0].id.toLowerCase() !== canonical.id.toLowerCase()
  ) {
    return null
  }

  return `/${segments.join('/')}`
}
