import { describe, expect, it } from 'vitest'

import { requiresServiceArea, requiresStreetAddress } from '../../lib/utils/resource-location.ts'

describe('resource location helpers', () => {
  it('normalizes loose string address types before applying rules', () => {
    expect(requiresStreetAddress('physical')).toBe(true)
    expect(requiresStreetAddress('regional')).toBe(false)
    expect(requiresServiceArea('regional')).toBe(true)
    expect(requiresServiceArea('physical')).toBe(false)
    expect(requiresServiceArea('REGIONAL')).toBe(true)
  })
})
