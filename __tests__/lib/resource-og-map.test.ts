import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const { sql } = vi.hoisted(() => ({ sql: vi.fn() }))
vi.mock('@/lib/db/client', () => ({ sql }))
import { getResourceMapTarget, getTileLayout, renderResourceMap } from '@/lib/seo/resource-og-map'
const ID = '78c6d0aa-9acc-446c-bb04-e328c90ebace'
describe('resource sharing map truth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })
  it('loads coordinates only from an active physical published resource identity', async () => {
    sql.mockResolvedValue([
      { latitude: 34.2780364, longitude: -119.2925223, address_type: 'physical' },
    ])
    expect(await getResourceMapTarget(ID)).toEqual({
      latitude: 34.2780364,
      longitude: -119.2925223,
    })
    expect(sql.mock.calls[0][0].join('')).toContain("status = 'active'")
  })
  it('never gives regional, absent or invalid coordinates a physical map pin', async () => {
    for (const row of [
      { latitude: 0, longitude: 0, address_type: 'physical' },
      { latitude: 34, longitude: -119, address_type: 'regional' },
      { latitude: null, longitude: null, address_type: 'physical' },
      { latitude: 95, longitude: 0, address_type: 'physical' },
    ]) {
      sql.mockResolvedValue([row])
      expect(await getResourceMapTarget(ID)).toBeNull()
    }
    sql.mockResolvedValue([])
    expect(await getResourceMapTarget(ID)).toBeNull()
    expect(await getResourceMapTarget('not-a-resource')).toBeNull()
  })
  it('centers the exact geographic point without inventing nearby pins', () => {
    const layout = getTileLayout({ latitude: 0, longitude: 0 }, 286, 172)
    expect(layout.zoom).toBe(14)
    expect(layout.pin).toEqual({ x: 143, y: 86 })
    expect(layout.tiles).toContainEqual(
      expect.objectContaining({ x: 8192, y: 8192, left: 143, top: 86 })
    )
    expect(layout.tiles.length).toBeLessThanOrEqual(6)
  })
  it('renders the requested street tiles with bounded caching and identifiable requests', async () => {
    const tile = await sharp({
      create: { width: 256, height: 256, channels: 3, background: '#cde3ec' },
    })
      .png()
      .toBuffer()
    const fetcher = vi.fn(
      async () => new Response(new Uint8Array(tile), { headers: { 'content-type': 'image/png' } })
    )
    vi.stubGlobal('fetch', fetcher)
    const result = await renderResourceMap({ latitude: 34.2780364, longitude: -119.2925223 })
    expect(result).toMatch(/^data:image\/png;base64,/)
    const image = await sharp(Buffer.from(result!.split(',')[1], 'base64')).metadata()
    expect(image).toMatchObject({ width: 286, height: 228, format: 'png' })
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(6)
    expect(fetcher.mock.calls[0]).toEqual([
      expect.stringMatching(/^https:\/\/tile.openstreetmap.org\/14\/\d+\/\d+\.png$/),
      expect.objectContaining({
        next: { revalidate: 604800 },
        headers: expect.objectContaining({ 'User-Agent': expect.stringContaining('ReentryMap') }),
      }),
    ])
  })
  it('uses a readable fallback on tile failure rather than a wrong map', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await renderResourceMap({ latitude: 34.2780364, longitude: -119.2925223 })).toBeNull()
  })
})
