import { analytics, track } from './queue'

interface SearchMetrics {
  scope: 'city' | 'state' | 'radius' | 'map' | 'nationwide'
  category: string
  results_count: number
}
interface Journey extends SearchMetrics {
  started_at: number
  contacted: boolean
  position?: number
}
const KEY = 'reentry-search-journey'

function readJourney(): Journey | null {
  try {
    const item = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Journey | null
    return item && Number.isFinite(item.started_at) && Date.now() - item.started_at < 30 * 60 * 1000
      ? item
      : null
  } catch {
    return null
  }
}
function writeJourney(journey: Journey) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(journey))
  } catch {
    /* Storage is optional. */
  }
}
export function beginSearchJourney(metrics: SearchMetrics) {
  if (!analytics.isTrackingEnabled()) return
  const existing = readJourney()
  writeJourney({
    ...metrics,
    started_at: existing?.started_at || Date.now(),
    contacted: existing?.contacted || false,
  })
  track('feature_search_results', { ...metrics, event_type: 'use' })
  if (existing?.results_count === 0 && metrics.results_count > 0) {
    track('feature_search_zero_recovery', {
      ...metrics,
      event_type: 'use',
      elapsed_ms: Math.max(0, Date.now() - existing.started_at),
    })
  }
}
export function recordSearchRefinement(
  action: 'category' | 'distance' | 'sort' | 'expand_area' | 'clear_filters' | 'map_area'
) {
  if (!analytics.isTrackingEnabled()) return
  const journey = readJourney()
  if (!journey) return
  track('feature_search_refinement', {
    refinement_action: action,
    scope: journey.scope,
    category: journey.category,
    results_count: journey.results_count,
    event_type: 'use',
  })
}
export function recordSearchPosition(position: number) {
  if (!analytics.isTrackingEnabled()) return
  const journey = readJourney()
  if (journey) writeJourney({ ...journey, position })
}
export function recordSearchContact(action: 'call' | 'directions' | 'website', position?: number) {
  if (!analytics.isTrackingEnabled()) return
  const journey = readJourney()
  if (!journey || journey.contacted) return
  track('feature_search_first_contact', {
    event_type: 'use',
    action,
    scope: journey.scope,
    category: journey.category,
    results_count: journey.results_count,
    position: position || journey.position,
    elapsed_ms: Math.max(0, Date.now() - journey.started_at),
  })
  writeJourney({ ...journey, contacted: true })
}
