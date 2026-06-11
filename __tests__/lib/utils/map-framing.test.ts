import { describe, it, expect } from 'vitest'
import { shouldAutoFitBounds, shouldPanToUserLocation } from '@/lib/utils/map-framing'

describe('shouldAutoFitBounds', () => {
  it('fits to resources when there is no user location (browse with no geolocation)', () => {
    expect(
      shouldAutoFitBounds({
        hasUserLocation: false,
        hasViewportBounds: false,
        fitToResources: false,
      })
    ).toBe(true)
  })

  it('does NOT fit when a user location is set and we are not forcing fit (search-near-me centers on user)', () => {
    expect(
      shouldAutoFitBounds({
        hasUserLocation: true,
        hasViewportBounds: false,
        fitToResources: false,
      })
    ).toBe(false)
  })

  it('STILL fits to resources when fitToResources is forced, even with a user location (city page)', () => {
    // This is the /ca/san-diego fix: a user located elsewhere must not pull the
    // map away from the city being browsed.
    expect(
      shouldAutoFitBounds({ hasUserLocation: true, hasViewportBounds: false, fitToResources: true })
    ).toBe(true)
  })

  it('never auto-fits when an explicit sharable viewport is present', () => {
    expect(
      shouldAutoFitBounds({ hasUserLocation: false, hasViewportBounds: true, fitToResources: true })
    ).toBe(false)
    expect(
      shouldAutoFitBounds({ hasUserLocation: true, hasViewportBounds: true, fitToResources: true })
    ).toBe(false)
  })
})

describe('shouldPanToUserLocation', () => {
  it('pans to the user when a location is set and we are not framing resources', () => {
    expect(shouldPanToUserLocation({ hasUserLocation: true, fitToResources: false })).toBe(true)
  })

  it('does NOT pan to the user on a city page (fitToResources), keeping the city framed', () => {
    expect(shouldPanToUserLocation({ hasUserLocation: true, fitToResources: true })).toBe(false)
  })

  it('does nothing without a user location', () => {
    expect(shouldPanToUserLocation({ hasUserLocation: false, fitToResources: false })).toBe(false)
  })
})
