import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { capture, getTarget, renderMap } = vi.hoisted(() => ({
  capture: vi.fn(),
  getTarget: vi.fn(),
  renderMap: vi.fn(),
}))
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(element: ReactElement) {
      capture(element)
    }
  },
}))
vi.mock('@/lib/seo/resource-og-map', () => ({
  getResourceMapTarget: getTarget,
  renderResourceMap: renderMap,
}))
import { GET } from '@/app/api/og/route'
const ID = '78c6d0aa-9acc-446c-bb04-e328c90ebace'
const map = 'data:image/png;base64,cHVibGlzaGVkLW1hcA=='

async function card(params: Record<string, string>) {
  await GET(new Request('https://reentrymap.org/api/og?' + new URLSearchParams(params)))
  document.body.innerHTML = renderToStaticMarkup(capture.mock.calls[0][0])
  return document.body
}

describe('sharing image brand and phone readability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTarget.mockResolvedValue(null)
  })
  it('uses the exact site wordmark at a recognizable size and removes miniature secondary copy', async () => {
    getTarget.mockResolvedValue({ latitude: 34.278, longitude: -119.292 })
    renderMap.mockResolvedValue(map)
    const dom = await card({
      kind: 'resource',
      resourceId: ID,
      title: 'Our Place',
      location: 'Ventura, CA',
      description: 'Details belong in the page preview metadata.',
    })
    const logo = dom.querySelector('img[alt="Reentry Map"]')
    const authentic = readFileSync(path.join(process.cwd(), 'public/ReentryMap_logo_400x100.png'))
    const src = logo?.getAttribute('src')
    expect(src?.startsWith('data:image/png;base64,')).toBe(true)
    const renderedHash = createHash('sha256')
      .update(Buffer.from(src!.split(',')[1], 'base64'))
      .digest('hex')
    expect(renderedHash).toBe(createHash('sha256').update(authentic).digest('hex'))
    expect(Number(logo?.getAttribute('width'))).toBeGreaterThanOrEqual(560)
    expect(dom.textContent).toContain('ReentryMap.org')
    expect(dom.textContent).toContain('Our Place')
    expect(dom.textContent).toContain('Ventura, CA')
    expect(dom.textContent).not.toContain('What you’ll find')
    expect(dom.textContent).not.toContain('Details belong in the page preview metadata.')
    const textElements = [...dom.querySelectorAll<HTMLElement>('*')].filter((el) =>
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())
    )
    expect(textElements.length).toBeGreaterThan(2)
    for (const el of textElements) expect(parseFloat(el.style.fontSize)).toBeGreaterThanOrEqual(44)
    expect(renderMap).toHaveBeenCalledWith({ latitude: 34.278, longitude: -119.292 })
    expect(dom.querySelector('img[alt*="Street map"]')?.getAttribute('src')).toBe(map)
    expect(dom.textContent).toContain('OpenStreetMap')
  })
  it('bounds unusually wide titles without shrinking the text into microcopy', async () => {
    getTarget.mockResolvedValue({ latitude: 34.278, longitude: -119.292 })
    renderMap.mockResolvedValue(map)
    const title = 'W'.repeat(80)
    const dom = await card({ kind: 'resource', resourceId: ID, title, location: 'Ventura, CA' })
    const heading = [...dom.querySelectorAll<HTMLElement>('div')].find(
      (el) => el.textContent === title
    )
    expect(heading?.style.display).toBe('block')
    expect(heading?.style.getPropertyValue('line-clamp')).toBe('4')
    expect(parseFloat(heading!.style.fontSize)).toBeGreaterThanOrEqual(60)
  })
  it('keeps long and regional titles large without adding an invented map', async () => {
    const title =
      'Northern California Community Resource and Reentry Support Center for Returning People'
    const dom = await card({ kind: 'resource', title, location: 'Sacramento County, CA' })
    expect(dom.textContent).toContain(title)
    expect(dom.textContent).toContain('Sacramento County, CA')
    expect(dom.querySelector('img[alt*="Street map"]')).toBeNull()
    expect(renderMap).not.toHaveBeenCalled()
  })
})
