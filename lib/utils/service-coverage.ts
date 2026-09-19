import { normalizeServiceArea } from './resource-location'
export interface SearchGeography {
  city?: string
  state?: string
  stateName?: string
  county?: string
  countyFips?: string
  counties?: { name: string; fips: string }[]
}
function normalize(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .replace(/ county\b/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
/** Match declared service eligibility. Never use a display/map anchor as proof of coverage. */
export function matchesServiceCoverage(
  resource: { state?: string | null; service_area?: unknown },
  area: SearchGeography
): boolean {
  const coverage = normalizeServiceArea(resource.service_area)
  if (!coverage) return false
  const type = coverage.type.toLowerCase()
  if (type === 'nationwide') return true
  const values = coverage.values.map(normalize)
  const states = [normalize(area.state), normalize(area.stateName)].filter(Boolean)
  if (type === 'statewide') return values.some((value) => states.includes(value))
  if (!area.state || (resource.state && normalize(resource.state) !== normalize(area.state)))
    return false
  const cities = [
    normalize(area.city),
    normalize([area.city, area.state].filter(Boolean).join(' ')),
    normalize([area.city, area.stateName].filter(Boolean).join(' ')),
  ].filter(Boolean)
  const counties = [
    normalize(area.county),
    normalize([area.county, area.state].filter(Boolean).join(' ')),
    area.countyFips || '',
    ...(area.counties || []).flatMap((county) => [
      normalize(county.name),
      normalize(county.name + ' ' + area.state),
      county.fips,
    ]),
  ].filter(Boolean)
  if (type === 'city') return values.some((value) => cities.includes(value))
  if (type === 'county') return values.some((value) => counties.includes(value))
  if (type === 'region')
    return values.some((value) => [...cities, ...counties, ...states].includes(value))
  return false
}
