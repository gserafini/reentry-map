import { describe, expect, it } from 'vitest'

import { resolveVisibleLocationName } from '@/lib/utils/location-scope'

describe('location scope helpers', () => {
  it('prefers an explicit URL location name over cached location context', () => {
    expect(resolveVisibleLocationName('Washington, USA', 'Dallas, Texas')).toBe('Washington, USA')
  })

  it('falls back to the cached/context display name when URL location is absent', () => {
    expect(resolveVisibleLocationName(null, 'Dallas, Texas')).toBe('Dallas, Texas')
  })
})
