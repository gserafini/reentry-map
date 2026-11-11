// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  queries: [] as Array<{ text: string; values: unknown[] }>,
}))

vi.mock('@/lib/db/client', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?')
    fixture.queries.push({ text, values })

    if (!text.includes('SELECT * FROM resources')) return Promise.resolve([])

    const cityMatches = (row: Record<string, unknown>) => {
      const rowCity = String(row.city)
      const requestedCity = String(values[0])
      return /LOWER\(city\)/i.test(text)
        ? rowCity.toLowerCase() === requestedCity.toLowerCase()
        : rowCity === requestedCity
    }
    const stateMatches = (row: Record<string, unknown>) => row.state === values[1]
    const activeMatches = (row: Record<string, unknown>) =>
      !text.includes("status = 'active'") || row.status === 'active'

    return Promise.resolve(
      fixture.rows.filter((row) => cityMatches(row) && stateMatches(row) && activeMatches(row))
    )
  },
}))

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

import ResourcePage, { generateMetadata } from '@/app/[state]/[city]/[resource-slug]/page'

const activeMcAllenResource = {
  id: 'mcallen-active',
  name: 'Second Chance Center',
  city: 'McAllen',
  state: 'TX',
  status: 'active',
  description: 'Employment support in McAllen.',
  primary_category: 'employment',
}

function imageUrl(metadata: Awaited<ReturnType<typeof generateMetadata>>): string {
  const image = metadata.openGraph?.images?.[0]
  if (typeof image === 'string') return image
  return image?.url instanceof URL ? image.url.toString() : String(image?.url || '')
}

describe('resource detail route city lookup', () => {
  beforeEach(() => {
    fixture.rows = [
      activeMcAllenResource,
      { ...activeMcAllenResource, id: 'mcallen-inactive', status: 'inactive' },
      { ...activeMcAllenResource, id: 'wrong-state', state: 'CA' },
    ]
    fixture.queries = []
  })

  it('resolves McAllen details and metadata case-insensitively while retaining active state scoping', async () => {
    const params = Promise.resolve({
      state: 'tx',
      city: 'mcallen',
      'resource-slug': 'second-chance-center',
    })

    await expect(ResourcePage({ params })).resolves.toBeTruthy()
    const metadata = await generateMetadata({ params })

    expect(metadata.title).toBe('Second Chance Center in McAllen, TX | Reentry Map')
    expect(imageUrl(metadata)).toContain('location=McAllen%2C+TX')
    expect(fixture.queries).toHaveLength(2)
    for (const query of fixture.queries) {
      expect(query.text).toMatch(
        /WHERE LOWER\(city\) = LOWER\(\?\) AND state = \? AND status = 'active'/
      )
      expect(query.values).toEqual(['Mcallen', 'TX'])
    }
  })
})
