import { describe, expect, it } from 'vitest'

import {
  buildGeocodingAddress,
  getApproximateLocationPresentation,
  getServiceAreaHeading,
  getServiceAreaSummary,
  hasPlausibleStreetAddress,
  needsPhysicalAddressReview,
  requiresServiceArea,
  requiresStreetAddress,
  shouldShowDirectionsForResource,
} from '../../lib/utils/resource-location.ts'

describe('resource location helpers', () => {
  it('normalizes loose string address types before applying rules', () => {
    expect(requiresStreetAddress('physical')).toBe(true)
    expect(requiresStreetAddress('regional')).toBe(false)
    expect(requiresServiceArea('regional')).toBe(true)
    expect(requiresServiceArea('physical')).toBe(false)
    expect(requiresServiceArea('REGIONAL')).toBe(true)
  })

  it('rejects city-only values for physical street addresses', () => {
    expect(hasPlausibleStreetAddress('San Diego, CA', 'San Diego', 'CA')).toBe(false)
    expect(hasPlausibleStreetAddress('San Diego', 'San Diego', 'CA')).toBe(false)
    expect(hasPlausibleStreetAddress('4047 Normal St', 'San Diego', 'CA')).toBe(true)
    expect(hasPlausibleStreetAddress('One Market St', 'San Francisco', 'CA')).toBe(true)
  })

  it('only flags weak addresses for physical resources', () => {
    expect(
      needsPhysicalAddressReview({
        addressType: 'physical',
        address: 'San Diego, CA',
        city: 'San Diego',
        state: 'CA',
      })
    ).toBe(true)

    expect(
      needsPhysicalAddressReview({
        addressType: 'regional',
        address: 'San Diego, CA',
        city: 'San Diego',
        state: 'CA',
      })
    ).toBe(false)
  })

  it('uses city/state centroids for non-physical resources that still have a locality', () => {
    expect(
      buildGeocodingAddress({
        addressType: 'physical',
        address: '4047 Normal St',
        city: 'San Diego',
        state: 'CA',
        zip: '92103',
      })
    ).toBe('4047 Normal St, San Diego, CA, 92103')

    expect(
      buildGeocodingAddress({
        addressType: 'confidential',
        address: '',
        city: 'San Diego',
        state: 'CA',
      })
    ).toBe('San Diego, CA')

    expect(
      buildGeocodingAddress({
        addressType: 'regional',
        address: '',
        city: 'Lubbock',
        state: 'TX',
      })
    ).toBe('Lubbock, TX')

    expect(
      buildGeocodingAddress({
        addressType: 'online',
        address: '',
        city: 'Austin',
        state: 'TX',
      })
    ).toBe('Austin, TX')
  })

  it('describes statewide resources clearly and suppresses street-level directions', () => {
    const statewideResource = {
      address_type: 'regional',
      service_area: { type: 'statewide', values: ['Texas'] },
      city: 'Lubbock',
      state: 'TX',
    }

    expect(getServiceAreaHeading(statewideResource)).toBe('Statewide resource')
    expect(getServiceAreaSummary(statewideResource)).toBe('Serves all of Texas')
    expect(getApproximateLocationPresentation(statewideResource)?.label).toBe(
      'Approximate statewide anchor location'
    )
    expect(shouldShowDirectionsForResource(statewideResource)).toBe(false)
  })

  it('accepts legacy service_area payloads that used a single name field', () => {
    const legacyCountyResource = {
      address_type: 'regional',
      service_area: { type: 'county', name: 'Alameda County' },
      city: 'Hayward',
      state: 'CA',
    }

    expect(getServiceAreaHeading(legacyCountyResource)).toBe('Countywide resource')
    expect(getServiceAreaSummary(legacyCountyResource)).toBe('Serves Alameda County')
  })

  it('treats hotline resources as non-physical coverage, not street-level locations', () => {
    const hotlineResource = {
      address_type: 'hotline',
      service_area: { type: 'county', name: 'Alameda County' },
      city: 'Hayward',
      state: 'CA',
    }

    expect(requiresStreetAddress('hotline')).toBe(false)
    expect(requiresServiceArea('hotline')).toBe(true)
    expect(getServiceAreaHeading(hotlineResource)).toBe('Countywide resource')
    expect(shouldShowDirectionsForResource(hotlineResource)).toBe(false)
  })
})
