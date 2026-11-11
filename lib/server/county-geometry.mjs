import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'

/** @typedef {{ fips_code: string, state_code: string, state_name: string, county_name: string }} CountyProperties */
/** @typedef {import('geojson').Feature<import('geojson').Polygon | import('geojson').MultiPolygon, CountyProperties>} CountyFeature */
/** @typedef {import('geojson').FeatureCollection<import('geojson').Polygon | import('geojson').MultiPolygon, CountyProperties>} CountyFeatureCollection */

/** @type {CountyFeature[] | undefined} */
let countyFeatures

/** Load the bundled county boundaries once per process. */
export function getCountyFeatures() {
  if (!countyFeatures) {
    const collection = /** @type {CountyFeatureCollection} */ (
      JSON.parse(readFileSync(join(process.cwd(), 'public/data/us-counties.geojson'), 'utf8'))
    )
    countyFeatures = collection.features
  }
  return countyFeatures
}

/**
 * Find the containing county. Invalid and uncovered points return null.
 * @param {number | null | undefined} latitude
 * @param {number | null | undefined} longitude
 * @param {string} [state]
 * @returns {CountyProperties | null}
 */
export function findCountyForCoordinates(latitude, longitude, state) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  const stateCode = state?.toUpperCase()
  const feature = getCountyFeatures().find(
    (county) =>
      (!stateCode || county.properties.state_code === stateCode) &&
      booleanPointInPolygon([longitude, latitude], county)
  )
  return feature?.properties ?? null
}
