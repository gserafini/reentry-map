import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  beginSearchJourney,
  recordSearchContact,
  recordSearchRefinement,
} from '@/lib/analytics/search-journey'
const track = vi.hoisted(() => vi.fn())
vi.mock('@/lib/analytics/queue', () => ({
  track,
  analytics: { isTrackingEnabled: () => localStorage.getItem('analytics_enabled') === 'true' },
}))

describe('search journey measurement', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    track.mockReset()
  })
  it('does not start a journey before consent', () => {
    beginSearchJourney({ scope: 'city', category: 'housing', results_count: 0 })
    expect(track).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('reentry-search-journey')).toBeNull()
  })
  it('keeps first-contact completion across result refinements', () => {
    localStorage.setItem('analytics_enabled', 'true')
    beginSearchJourney({ scope: 'city', category: 'housing', results_count: 4 })
    recordSearchContact('call', 1)
    beginSearchJourney({ scope: 'city', category: 'housing', results_count: 3 })
    recordSearchContact('website', 2)
    expect(
      track.mock.calls.filter((call) => call[0] === 'feature_search_first_contact')
    ).toHaveLength(1)
  })
  it('records when refinement recovers from an empty result set', () => {
    localStorage.setItem('analytics_enabled', 'true')
    beginSearchJourney({ scope: 'radius', category: 'housing', results_count: 0 })
    beginSearchJourney({ scope: 'radius', category: 'housing', results_count: 3 })
    expect(track).toHaveBeenCalledWith(
      'feature_search_zero_recovery',
      expect.objectContaining({ results_count: 3 })
    )
  })
  it('measures results, refinement and first contact without search words or coordinates', () => {
    localStorage.setItem('analytics_enabled', 'true')
    beginSearchJourney({ scope: 'city', category: 'housing', results_count: 4 })
    recordSearchRefinement('expand_area')
    expect(track).toHaveBeenLastCalledWith(
      'feature_search_refinement',
      expect.objectContaining({ refinement_action: 'expand_area' })
    )
    recordSearchContact('call', 2)
    recordSearchContact('website', 3)
    expect(track.mock.calls.map((call) => call[0])).toEqual([
      'feature_search_results',
      'feature_search_refinement',
      'feature_search_first_contact',
    ])
    expect(track).toHaveBeenLastCalledWith(
      'feature_search_first_contact',
      expect.objectContaining({ action: 'call', position: 2, results_count: 4, scope: 'city' })
    )
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/latitude|longitude|query|locationName/)
  })
})
