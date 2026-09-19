import { parseStateLocationName, normalizeStateCode } from './location-scope'
import { parseViewportBounds } from './map-viewport'
import { parseCitySlug } from './urls'

type SearchParams = { get: (key: string) => string | null }

export function getPathLocation(pathname = '') {
  const match = pathname.match(/^\/([a-z]{2})(?:\/([^/]+)(?:\/category\/[^/]+)?)?\/?$/)
  const state = match ? normalizeStateCode(match[1]) : undefined
  if (!state) return null
  const city = match?.[2] ? parseCitySlug(match[2]) : undefined
  return { state, city, label: city ? `${city}, ${state}` : state }
}

export function resolveSearchLocation(params: SearchParams, pathname?: string) {
  const path = getPathLocation(pathname)
  const locationName = path?.label || params.get('locationName')?.trim() || undefined
  const explicitState = normalizeStateCode(params.get('state'))
  const city = path?.city || (explicitState ? params.get('city')?.trim() || undefined : undefined)
  const state = path?.state || explicitState || parseStateLocationName(locationName)
  const viewportBounds = path ? null : parseViewportBounds(params)
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  const validCoordinates =
    params.get('lat') &&
    params.get('lng') &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
  const coordinates =
    !state && !viewportBounds && validCoordinates ? { latitude: lat, longitude: lng } : null
  const distance = Number(params.get('distance') || 25)
  const radiusMiles = coordinates
    ? Number.isFinite(distance) && distance >= 1 && distance <= 100
      ? distance
      : 25
    : undefined
  return {
    coordinates,
    radiusMiles,
    state,
    city,
    viewportBounds,
    locationName,
    label: city
      ? `${city}, ${state}`
      : state
        ? locationName || state
        : viewportBounds
          ? 'Map area'
          : coordinates
            ? locationName || 'Selected location'
            : 'Nationwide',
  }
}
