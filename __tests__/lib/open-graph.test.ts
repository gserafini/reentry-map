import { describe, expect, it } from 'vitest'
import { createOpenGraphImage, parseOpenGraphImageParams } from '@/lib/seo/open-graph'

describe('Open Graph image metadata', () => {
  it('builds a page-specific image URL with useful share-card context', () => {
    const image = createOpenGraphImage({
      kind: 'city-category',
      eyebrow: 'Local resource directory',
      title: 'Employment help in Dallas, TX',
      description: 'Job placement, training, and career services for people navigating reentry.',
      location: 'Dallas, TX',
      category: 'employment',
      count: 42,
    })

    const url = new URL(image.url, 'https://reentrymap.org')
    expect(url.pathname).toBe('/api/og')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      kind: 'city-category',
      eyebrow: 'Local resource directory',
      title: 'Employment help in Dallas, TX',
      location: 'Dallas, TX',
      category: 'employment',
      count: '42',
    })
    expect(image).toMatchObject({
      width: 1200,
      height: 630,
      alt: 'Employment help in Dallas, TX | Reentry Map',
    })
  })

  it('sanitizes and bounds public query-string content before rendering', () => {
    const params = new URLSearchParams({
      kind: 'not-a-real-kind',
      title: `  Find\nhelp\u0000 ${'today '.repeat(30)}  `,
      eyebrow: '  Community\t directory  ',
      description: ' A useful description. '.repeat(20),
      location: ' Dallas,\nTX ',
      category: 'unknown-category',
      count: '-7',
    })

    const model = parseOpenGraphImageParams(params)
    expect(model.kind).toBe('directory')
    expect(model.title).not.toMatch(/[\n\u0000]/)
    expect(model.title.length).toBeLessThanOrEqual(86)
    expect(model.eyebrow).toBe('Community directory')
    expect(model.description.length).toBeLessThanOrEqual(150)
    expect(model.description.endsWith('…')).toBe(true)
    expect(model.location).toBe('Dallas, TX')
    expect(model.category).toBeNull()
    expect(model.count).toBeNull()
    expect(model.accent).toBe('#1565c0')
  })

  it('uses distinct category colors and concise, useful defaults', () => {
    const housing = parseOpenGraphImageParams(
      new URLSearchParams({ kind: 'category', title: 'Housing resources', category: 'housing' })
    )
    const employment = parseOpenGraphImageParams(
      new URLSearchParams({
        kind: 'category',
        title: 'Employment resources',
        category: 'employment',
        count: '497',
      })
    )

    expect(housing.accent).toBe('#388e3c')
    expect(employment.accent).toBe('#1976d2')
    expect(employment.highlights).toEqual([
      '497 community listings',
      'Free to search',
      'Contact providers directly',
    ])
  })
})
