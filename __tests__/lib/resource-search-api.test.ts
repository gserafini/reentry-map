import { beforeEach, describe, expect, it, vi } from 'vitest'
const fixture = vi.hoisted(() => ({
  rows: [
    { id: 'a', primary_category: 'housing', categories: ['housing', 'employment'] },
    { id: 'b', primary_category: 'housing', categories: null },
  ],
  queries: [] as string[],
}))
vi.mock('@/lib/db/client', () => {
  const tag = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.reduce(
        (t, s, i) => t + s + (i < values.length ? String(values[i]) : ''),
        ''
      )
      return {
        toString: () => text,
        then: (resolve: (v: unknown) => void) => {
          fixture.queries.push(text)
          resolve(fixture.rows)
        },
      }
    },
    { unsafe: (s: string) => s }
  )
  return { sql: tag }
})
import { getCategoryCounts } from '@/lib/api/resources'
describe('category facet counts', () => {
  beforeEach(() => {
    fixture.queries = []
  })
  it('counts the union of primary and secondary categories once per resource', async () => {
    const result = await getCategoryCounts()
    expect(result.data).toEqual({ housing: 2, employment: 1 })
  })
})
