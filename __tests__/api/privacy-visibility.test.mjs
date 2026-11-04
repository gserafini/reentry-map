import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { PgDialect } from 'drizzle-orm/pg-core'

const { sql } = vi.hoisted(() => ({ sql: vi.fn() }))
vi.mock('@/lib/db/client', () => ({ sql }))
const source = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const query = () => sql.mock.calls.at(-1)[0].join('?')

describe('privacy and public visibility boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sql.mockResolvedValue([])
  })

  it('uses explicit safe projections for every admin user read/update response', () => {
    const code = source('app/api/admin/users/route.ts')
    expect(code).not.toMatch(/\.select\(\)|\.returning\(\)/)
    expect(code).toMatch(/\.select\(safeUserProjection\)/)
    expect(code).toMatch(/\.returning\(safeUserProjection\)/)
    expect(code).not.toContain('passwordHash')
  })

  it('profile selects and returning clauses never include credential columns implicitly', () => {
    const code = source('app/api/profile/route.ts')
    expect(code).not.toMatch(/SELECT\s+\*|RETURNING\s+\*/i)
    expect(code).not.toContain('password_hash')
  })

  it('public reviews expose only approved content and no reviewer phone', async () => {
    const { getResourceReviews } = await import('../../lib/api/reviews.ts')
    await getResourceReviews('resource')
    expect(query()).toMatch(/rr\.status\s*=\s*'approved'/)
    expect(query()).toMatch(/r\.status\s*=\s*'active'/)
    expect(query()).not.toContain('u.phone')
  })

  it('owner review access retains all statuses and owner scope', async () => {
    const { getUserReview } = await import('../../lib/api/reviews.ts')
    await getUserReview('owner', 'resource')
    expect(query()).toContain('WHERE user_id = ? AND resource_id = ?')
    expect(query()).not.toContain("status = 'approved'")
    expect(sql.mock.calls.at(-1).slice(1)).toEqual(['owner', 'resource'])
  })

  it('favorites return only active resources using a public projection', async () => {
    const { getUserFavorites } = await import('../../lib/api/favorites.ts')
    await getUserFavorites('owner')
    expect(query()).toMatch(/r\.status\s*=\s*'active'/)
    expect(query()).not.toMatch(/r\.\*/)
    expect(query()).not.toContain('verification_history')
    expect(query()).toContain('uf.user_id = ?')
  })

  it('adding a favorite atomically requires an active resource and reports unavailable rows', async () => {
    const { addFavorite } = await import('../../lib/api/favorites.ts')
    const result = await addFavorite('owner', 'inactive')
    expect(query()).toMatch(/SELECT[\s\S]+FROM resources[\s\S]+status\s*=\s*'active'/)
    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
  })

  it.each(['GET', 'POST'])(
    'public prompt %s filters every resource lookup/count to active',
    async (method) => {
      vi.resetModules()
      const predicates = []
      const db = {
        select: vi.fn(() => ({
          from: () => ({
            where: (predicate) => {
              predicates.push(new PgDialect().sqlToQuery(predicate))
              const promise = Promise.resolve([{ value: 0 }])
              promise.orderBy = () => Promise.resolve([])
              return promise
            },
          }),
        })),
      }
      vi.doMock('@/lib/db/client', () => ({ db }))
      const route = await import('../../app/api/admin/prompt-generator/route.ts')
      const url = 'https://example.org/api/admin/prompt-generator?city=Oakland&state=CA'
      const request = new Request(
        url,
        method === 'POST'
          ? { method, body: JSON.stringify({ city: 'Oakland', state: 'CA', targetCount: 2 }) }
          : undefined
      )
      request.nextUrl = new URL(url)
      expect((await route[method](request)).status).toBe(200)
      expect(predicates.length).toBe(method === 'POST' ? 2 : 1)
      for (const predicate of predicates) {
        expect(predicate.sql).toContain('"resources"."status"')
        expect(predicate.params).toContain('active')
      }
    }
  )
})
