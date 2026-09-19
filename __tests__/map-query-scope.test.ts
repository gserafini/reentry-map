import { describe, expect, it } from 'vitest'
import { buildViewportUrl } from '@/lib/utils/map-viewport'
describe('map query scope', () => {
  it('replaces the city filter when deliberately searching a new map area', () => {
    const url = buildViewportUrl(
      '/resources',
      new URLSearchParams('city=Dallas&state=TX&search=housing'),
      { north: 40, south: 39, east: -104, west: -105 }
    )
    expect(url).not.toContain('city=')
    expect(url).not.toContain('state=')
    expect(url).toContain('search=housing')
    expect(url).toContain('north=40')
  })
})
