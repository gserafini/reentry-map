import sharp from 'sharp'
import { sql } from '@/lib/db/client'

export interface MapTarget {
  latitude: number
  longitude: number
}
interface MapRow {
  latitude: number | null
  longitude: number | null
  address_type: string | null
}
interface Tile {
  x: number
  y: number
  left: number
  top: number
}
export const RESOURCE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TILE_SIZE = 256
const ZOOM = 14
const WIDTH = 286
const HEIGHT = 172

export async function getResourceMapTarget(id: string | null): Promise<MapTarget | null> {
  if (!id || !RESOURCE_ID_PATTERN.test(id)) return null
  const [row] = await sql<MapRow[]>`
    SELECT latitude, longitude, address_type FROM resources
    WHERE id = ${id} AND status = 'active' LIMIT 1
  `
  if (
    !row ||
    row.address_type !== 'physical' ||
    typeof row.latitude !== 'number' ||
    typeof row.longitude !== 'number' ||
    !Number.isFinite(row.latitude) ||
    !Number.isFinite(row.longitude) ||
    (row.latitude === 0 && row.longitude === 0) ||
    Math.abs(row.latitude) > 85.05112878 ||
    Math.abs(row.longitude) > 180
  )
    return null
  return { latitude: row.latitude, longitude: row.longitude }
}

/** Web Mercator viewport: the published point is exactly at the image centre. */
export function getTileLayout(
  target: MapTarget,
  width = WIDTH,
  height = HEIGHT
): {
  zoom: number
  tiles: Tile[]
  pin: { x: number; y: number }
} {
  const scale = 2 ** ZOOM
  const sin = Math.sin((target.latitude * Math.PI) / 180)
  const centreX = ((target.longitude + 180) / 360) * scale * TILE_SIZE
  const centreY = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale * TILE_SIZE
  const left = Math.floor(centreX - width / 2)
  const top = Math.floor(centreY - height / 2)
  const tiles: Tile[] = []
  for (let y = Math.floor(top / TILE_SIZE); y <= Math.floor((top + height - 1) / TILE_SIZE); y++) {
    for (
      let x = Math.floor(left / TILE_SIZE);
      x <= Math.floor((left + width - 1) / TILE_SIZE);
      x++
    ) {
      if (y >= 0 && y < scale)
        tiles.push({
          x: ((x % scale) + scale) % scale,
          y,
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top,
        })
    }
  }
  return { zoom: ZOOM, tiles, pin: { x: width / 2, y: height / 2 } }
}

/** Only on-demand viewport tiles; identifiable requests and a seven-day shared cache. */
export async function renderResourceMap(target: MapTarget): Promise<string | null> {
  try {
    const layout = getTileLayout(target)
    const layers = await Promise.all(
      layout.tiles.map(async (tile) => {
        const response = await fetch(
          `https://tile.openstreetmap.org/${layout.zoom}/${tile.x}/${tile.y}.png`,
          {
            headers: {
              'User-Agent': 'ReentryMap/1.0 (+https://reentrymap.org)',
              Referer: 'https://reentrymap.org/',
            },
            next: { revalidate: 604800 },
            signal: AbortSignal.timeout(5000),
          }
        )
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png'))
          throw new Error('Map tile unavailable')
        const bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.length > 1024 * 1024) throw new Error('Map tile exceeds size limit')
        const cropLeft = Math.max(0, -tile.left),
          cropTop = Math.max(0, -tile.top)
        const left = Math.max(0, tile.left),
          top = Math.max(0, tile.top)
        const width = Math.min(TILE_SIZE - cropLeft, WIDTH - left)
        const height = Math.min(TILE_SIZE - cropTop, HEIGHT - top)
        const input = await sharp(bytes, { limitInputPixels: TILE_SIZE * TILE_SIZE })
          .extract({ left: cropLeft, top: cropTop, width, height })
          .png()
          .toBuffer()
        return { input, left, top }
      })
    )
    const image = await sharp({
      create: { width: WIDTH, height: HEIGHT, channels: 3, background: '#e8f0f6' },
    })
      .composite(layers)
      .png()
      .toBuffer()
    return `data:image/png;base64,${image.toString('base64')}`
  } catch {
    // No guessed position, fabricated roads or private provider error details.
    return null
  }
}
