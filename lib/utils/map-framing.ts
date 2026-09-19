/**
 * Map framing rules — pure decisions for how a ResourceMap should choose its
 * viewport. Extracted so the (non-obvious) precedence is unit-testable.
 *
 * Precedence:
 *   1. An explicit sharable viewport (viewportBounds) always wins.
 *   2. Otherwise, fit to the resources when EITHER we're explicitly framing a
 *      place (fitToResources — e.g. a city/category/tag browse page) OR there is
 *      no user location to center on.
 *   3. Only when a user location is set AND we are not framing a place do we
 *      center/pan to the user (search-near-me).
 */

export interface MapFramingState {
  hasUserLocation: boolean
  hasViewportBounds: boolean
  fitToResources: boolean
}

/** Whether the map should fit its bounds to the displayed resources. */
export function shouldAutoFitBounds(state: MapFramingState): boolean {
  if (state.hasViewportBounds) return false
  return state.fitToResources || !state.hasUserLocation
}

/** Whether the map should pan/center on the user's location. */
export function shouldPanToUserLocation(
  state: Pick<MapFramingState, 'hasUserLocation' | 'fitToResources'>
): boolean {
  return state.hasUserLocation && !state.fitToResources
}
