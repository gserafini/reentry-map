import { describe, expect, it } from 'vitest'

import {
  hasPlausibleStreetAddress,
  requiresServiceArea,
  requiresStreetAddress,
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
})
