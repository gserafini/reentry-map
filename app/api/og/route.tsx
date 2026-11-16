/* eslint-disable @next/next/no-img-element -- ImageResponse requires native image elements. */
import { ImageResponse } from 'next/og'
import { getResourceMapTarget, renderResourceMap } from '@/lib/seo/resource-og-map'
import {
  OPEN_GRAPH_IMAGE_HEIGHT,
  OPEN_GRAPH_IMAGE_WIDTH,
  parseOpenGraphImageParams,
} from '@/lib/seo/open-graph'

export const runtime = 'nodejs'

function CompassMark() {
  return (
    <div
      style={{
        width: 58,
        height: 58,
        borderRadius: 16,
        background: '#fadf61',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          background: '#1565c0',
          transform: 'rotate(45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: '#ffffff',
            border: '3px solid #0b2944',
            display: 'flex',
          }}
        />
      </div>
    </div>
  )
}

export async function GET(request: Request) {
  const model = parseOpenGraphImageParams(new URL(request.url).searchParams)
  const target = await getResourceMapTarget(model.resourceId).catch(() => null)
  const mapImage = target ? await renderResourceMap(target) : null

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        background: 'linear-gradient(125deg, #091d2f 0%, #103a5d 58%, #1565c0 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -180,
          bottom: -310,
          width: 650,
          height: 650,
          borderRadius: 999,
          border: '2px solid rgba(250, 223, 97, 0.17)',
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -80,
          bottom: -210,
          width: 450,
          height: 450,
          borderRadius: 999,
          border: '2px solid rgba(250, 223, 97, 0.13)',
          display: 'flex',
        }}
      />

      <div
        style={{
          width: 790,
          height: '100%',
          padding: '56px 38px 48px 68px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CompassMark />
          <div
            style={{
              marginLeft: 18,
              display: 'flex',
              flexDirection: 'column',
              lineHeight: 1,
            }}
          >
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, letterSpacing: 1.4 }}>
              REENTRY MAP
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 7,
                fontSize: 15,
                color: '#c9d9e8',
                letterSpacing: 0.5,
              }}
            >
              Find practical help near you
            </div>
          </div>
        </div>

        <div
          style={{
            alignSelf: 'flex-start',
            display: 'flex',
            marginTop: 56,
            padding: '9px 16px',
            borderRadius: 999,
            background: 'rgba(250, 223, 97, 0.14)',
            border: '1px solid rgba(250, 223, 97, 0.48)',
            color: '#ffe98a',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {model.eyebrow}
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 20,
            fontSize: 58,
            lineHeight: 1.04,
            fontWeight: 800,
            letterSpacing: -2.2,
            maxWidth: 700,
          }}
        >
          {model.title}
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 19,
            maxWidth: 690,
            color: '#d9e6f0',
            fontSize: 23,
            lineHeight: 1.35,
          }}
        >
          {model.description}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 'auto',
            fontSize: 18,
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              marginRight: 10,
              borderRadius: 999,
              background: '#fadf61',
              display: 'flex',
            }}
          />
          reentrymap.org
          <div style={{ display: 'flex', marginLeft: 18, color: '#a9c0d3', fontWeight: 400 }}>
            Free to use
          </div>
        </div>
      </div>

      <div
        style={{
          width: 410,
          height: '100%',
          padding: '52px 50px 48px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 342,
            minHeight: 458,
            padding: '30px 28px',
            borderRadius: 30,
            background: '#f8f4e9',
            color: '#0b2944',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 172,
              borderRadius: 20,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              background: '#e8f0f6',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            {mapImage ? (
              <>
                <img
                  src={mapImage}
                  width={286}
                  height={172}
                  alt="Street map centered on the published service location"
                />
                <svg
                  width="38"
                  height="48"
                  viewBox="0 0 38 48"
                  style={{ position: 'absolute', left: 124, top: 41 }}
                >
                  <path
                    d="M19 2C9.6 2 2 9.6 2 19c0 12.7 17 26 17 26S36 31.7 36 19C36 9.6 28.4 2 19 2Z"
                    fill={model.accent}
                    stroke="white"
                    strokeWidth="3"
                  />
                  <circle cx="19" cy="19" r="6" fill="white" />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: 'rgba(255,255,255,0.92)',
                    color: '#183f60',
                    fontSize: 12,
                    padding: '3px 5px',
                    display: 'flex',
                  }}
                >
                  © OpenStreetMap contributors
                </div>
              </>
            ) : (
              <>
                <CompassMark />
                <div
                  style={{
                    display: 'flex',
                    marginTop: 16,
                    fontSize: 18,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  Service information
                </div>
              </>
            )}
          </div>

          {(model.categoryLabel || model.location) && (
            <div style={{ display: 'flex', marginTop: 22, flexWrap: 'wrap' }}>
              {model.categoryLabel && (
                <div
                  style={{
                    display: 'flex',
                    padding: '7px 12px',
                    marginRight: 8,
                    marginBottom: 8,
                    borderRadius: 999,
                    background: model.accent,
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {model.categoryLabel}
                </div>
              )}
              {model.location && (
                <div
                  style={{
                    display: 'flex',
                    padding: '7px 12px',
                    marginBottom: 8,
                    borderRadius: 999,
                    background: '#e2eaf1',
                    color: '#183f60',
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {model.location}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              marginTop: model.categoryLabel || model.location ? 13 : 25,
              marginBottom: 13,
              color: '#5b7185',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            What you’ll find
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {model.highlights.map((highlight) => (
              <div
                key={highlight}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: 8,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                <div
                  style={{
                    width: 25,
                    height: 25,
                    marginRight: 11,
                    borderRadius: 999,
                    background: '#dcecdf',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      background: '#216b36',
                      display: 'flex',
                    }}
                  />
                </div>
                {highlight}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    {
      width: OPEN_GRAPH_IMAGE_WIDTH,
      height: OPEN_GRAPH_IMAGE_HEIGHT,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
