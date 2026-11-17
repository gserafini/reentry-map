/* eslint-disable @next/next/no-img-element -- ImageResponse requires native image elements. */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { getResourceMapTarget, renderResourceMap } from '@/lib/seo/resource-og-map'
import {
  OPEN_GRAPH_IMAGE_HEIGHT,
  OPEN_GRAPH_IMAGE_WIDTH,
  parseOpenGraphImageParams,
} from '@/lib/seo/open-graph'

export const runtime = 'nodejs'

// Reuse the exact public site asset; no outbound logo request or substitute mark.
const logo = readFile(path.join(process.cwd(), 'public/ReentryMap_logo_400x100.png')).then(
  (bytes) => `data:image/png;base64,${bytes.toString('base64')}`
)

const fonts = Promise.all([
  readFile(path.join(process.cwd(), 'public/fonts/LiberationSans-Regular.ttf')),
  readFile(path.join(process.cwd(), 'public/fonts/LiberationSans-Bold.ttf')),
])

export async function GET(request: Request) {
  const model = parseOpenGraphImageParams(new URL(request.url).searchParams)
  const target = await getResourceMapTarget(model.resourceId).catch(() => null)
  const mapImage = target ? await renderResourceMap(target) : null
  const titleSize = mapImage
    ? model.title.length > 40
      ? 60
      : 72
    : model.title.length > 64 || (model.location?.length || 0) > 28
      ? 72
      : 88

  const [regular, bold] = await fonts

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: '#10344c',
        color: '#ffffff',
        fontFamily: 'Liberation Sans',
      }}
    >
      <div
        style={{
          width: '100%',
          height: 152,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
          background: '#fee36b',
        }}
      >
        <img src={await logo} width={608} height={152} alt="Reentry Map" />
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: '#10344c' }}>
          ReentryMap.org
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          padding: mapImage ? '28px 48px 72px' : '36px 48px 40px',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: mapImage ? 656 : 1104,
            height: mapImage ? 378 : 388,
          }}
        >
          <div
            style={{
              display: 'block',
              fontSize: titleSize,
              lineHeight: 1.08,
              fontWeight: 700,
              lineClamp: mapImage && titleSize === 60 ? 4 : 3,
              textOverflow: 'ellipsis',
              letterSpacing: -1.5,
              wordBreak: 'break-word',
            }}
          >
            {model.title}
          </div>
          {model.location && (
            <div
              style={{
                display: 'block',
                marginTop: 12,
                fontSize: 48,
                lineHeight: 1.1,
                lineClamp: titleSize === 88 ? 1 : 2,
                wordBreak: 'break-word',
                textOverflow: 'ellipsis',
                fontWeight: 700,
                color: '#fee36b',
              }}
            >
              {model.location}
            </div>
          )}
        </div>

        {mapImage && (
          <div
            style={{
              display: 'flex',
              width: 416,
              height: 332,
              flexShrink: 0,
              borderRadius: 24,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <img
              src={mapImage}
              width={416}
              height={332}
              alt="Street map centered on the published service location"
            />
            <svg
              width="66"
              height="84"
              viewBox="0 0 38 48"
              style={{ position: 'absolute', left: 175, top: 87.25 }}
            >
              <path
                d="M19 2C9.6 2 2 9.6 2 19c0 12.7 17 26 17 26S36 31.7 36 19C36 9.6 28.4 2 19 2Z"
                fill={model.accent}
                stroke="white"
                strokeWidth="3"
              />
              <circle cx="19" cy="19" r="6" fill="white" />
            </svg>
          </div>
        )}
      </div>
      {mapImage && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 12,
            right: 48,
            fontSize: 44,
            lineHeight: 1.1,
            color: '#dce6ed',
          }}
        >
          © OpenStreetMap contributors
        </div>
      )}
    </div>,
    {
      width: OPEN_GRAPH_IMAGE_WIDTH,
      height: OPEN_GRAPH_IMAGE_HEIGHT,
      fonts: [
        { name: 'Liberation Sans', data: regular, weight: 400, style: 'normal' },
        { name: 'Liberation Sans', data: bold, weight: 700, style: 'normal' },
      ],
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
