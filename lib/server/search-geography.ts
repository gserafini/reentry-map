import booleanIntersects from '@turf/boolean-intersects'
import type { Feature, Polygon, MultiPolygon } from 'geojson'
import type { MapViewportBounds } from '@/lib/utils/map-viewport'
import { cache } from 'react'
import type { SearchGeography } from '@/lib/utils/service-coverage'
import { parseStateLocationName } from '@/lib/utils/location-scope'
import { findCountyForCoordinates, getCountyFeatures } from './county-geometry.mjs'

type CountyProperties = {
  fips_code: string
  state_code: string
  state_name: string
  county_name: string
}
/** Cached bundled boundaries keep scope independent of reverse-geocoding availability or IP location. */
export const resolveSearchGeography = cache(
  (
    locationName: string,
    latitude?: number,
    longitude?: number,
    state?: string,
    city?: string
  ): SearchGeography => {
    const parts = locationName
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    const namedState = parseStateLocationName(locationName)
    const area: SearchGeography = {
      state: state || namedState,
      city: city || (!namedState && parts.length > 1 ? parts[0] : undefined),
    }
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const county = findCountyForCoordinates(latitude, longitude, state)
      if (county)
        return {
          ...area,
          state: county.state_code,
          stateName: county.state_name,
          county: county.county_name,
          countyFips: county.fips_code,
        }
    }
    // A label from Places can supply a state for city URLs without coordinates.
    if (!area.state && parts.length > 1 && /^[A-Z]{2}$/.test(parts[1])) area.state = parts[1]
    if (area.state) {
      area.stateName = getCountyFeatures().find(
        (feature) => feature.properties.state_code === area.state
      )?.properties.state_name
    }
    return area
  }
)

/** City browsing can span counties. Use geocoded physical addresses as evidence of
 * the counties represented in the selected city, never nonphysical display anchors.
 * Cards retain the actual county service area rather than implying citywide eligibility.
 */
export function resolveCityCounties(
  area: SearchGeography,
  points: { latitude: number | null; longitude: number | null }[]
): SearchGeography {
  const found = new Map<string, { name: string; fips: string }>()
  for (const point of points) {
    if (point.latitude === null || point.longitude === null) continue
    const county = resolveSearchGeography('', point.latitude, point.longitude, area.state)
    if (county.county && county.countyFips && county.state === area.state)
      found.set(county.countyFips, { name: county.county, fips: county.countyFips })
  }
  return { ...area, counties: [...found.values()] }
}

type CountyFeature = Feature<Polygon | MultiPolygon, CountyProperties>
const countyBounds = new WeakMap<CountyFeature, MapViewportBounds>()

function getCountyBounds(feature: CountyFeature): MapViewportBounds {
  const cached = countyBounds.get(feature)
  if (cached) return cached
  const points =
    feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates.flat()
      : feature.geometry.coordinates.flat(2)
  const bounds = { north: -90, south: 90, west: 180, east: -180 }
  for (const [longitude, latitude] of points) {
    bounds.north = Math.max(bounds.north, latitude)
    bounds.south = Math.min(bounds.south, latitude)
    bounds.east = Math.max(bounds.east, longitude)
    bounds.west = Math.min(bounds.west, longitude)
  }
  countyBounds.set(feature, bounds)
  return bounds
}

/** Actual county polygons determine viewport coverage, including state/county
 * crossings. Bounding boxes only prune candidates; they never establish a match.
 * No resource display anchor or county centroid is used as service evidence.
 */
export function resolveViewportGeographies(bounds: MapViewportBounds): SearchGeography[] {
  if (
    !Object.values(bounds).every(Number.isFinite) ||
    bounds.north <= bounds.south ||
    bounds.north > 90 ||
    bounds.south < -90 ||
    Math.abs(bounds.west) > 180 ||
    Math.abs(bounds.east) > 180 ||
    bounds.west === bounds.east
  )
    return []
  const parts =
    bounds.west < bounds.east
      ? [bounds]
      : [
          { ...bounds, east: 180 },
          { ...bounds, west: -180 },
        ]
  const polygons = parts.map(
    (part): Polygon => ({
      type: 'Polygon',
      coordinates: [
        [
          [part.west, part.south],
          [part.east, part.south],
          [part.east, part.north],
          [part.west, part.north],
          [part.west, part.south],
        ],
      ],
    })
  )
  return getCountyFeatures()
    .filter((feature) => {
      const county = getCountyBounds(feature)
      return parts.some(
        (part, index) =>
          county.north >= part.south &&
          county.south <= part.north &&
          county.east >= part.west &&
          county.west <= part.east &&
          booleanIntersects(feature, polygons[index])
      )
    })
    .map(({ properties }) => ({
      state: properties.state_code,
      stateName: properties.state_name,
      county: properties.county_name,
      countyFips: properties.fips_code,
    }))
}
