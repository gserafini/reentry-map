import type { ResourcesPageSearchParams } from '@/app/resources/params'
import { parsePageNumber } from './pagination'

/** Canonical results URL used by older SEO entry routes. Explicit path scope wins. */
export function canonicalResultsUrl(
  filters: ResourcesPageSearchParams,
  scope: Pick<ResourcesPageSearchParams, 'city' | 'state' | 'categories' | 'tags'>
) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  )
  if (scope.city || scope.state) {
    for (const key of [
      'lat',
      'lng',
      'distance',
      'north',
      'south',
      'east',
      'west',
      'locationName',
      'city',
      'state',
    ])
      params.delete(key)
  }
  for (const [key, value] of Object.entries(scope)) if (value) params.set(key, value)
  if (params.has('page')) params.set('page', String(parsePageNumber(params.get('page'))))
  return '/resources?' + params.toString()
}
