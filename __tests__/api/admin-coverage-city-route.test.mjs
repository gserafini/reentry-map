import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('admin coverage city route', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('counts secondary categories from categories arrays in city coverage results', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { category: 'employment', count: 1 },
              { category: 'housing', count: 1 },
              { category: 'food', count: 1 },
              { category: 'clothing', count: 1 },
              { category: 'healthcare', count: 1 },
              { category: 'substance-abuse', count: 1 },
              { category: 'legal-aid', count: 1 },
              { category: 'transportation', count: 1 },
              { category: 'id-documents', count: 1 },
              { category: 'education', count: 1 },
              { category: 'faith-based', count: 1 },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ value: 11 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ value: 0 }]),
          }),
        }),
    }

    const sql = vi
      .fn()
      .mockResolvedValueOnce([
        { category: 'employment', count: 1 },
        { category: 'housing', count: 1 },
        { category: 'food', count: 1 },
        { category: 'clothing', count: 1 },
        { category: 'healthcare', count: 1 },
        { category: 'mental-health', count: 1 },
        { category: 'substance-abuse', count: 1 },
        { category: 'legal-aid', count: 1 },
        { category: 'transportation', count: 1 },
        { category: 'id-documents', count: 1 },
        { category: 'education', count: 1 },
        { category: 'faith-based', count: 1 },
        { category: 'general-support', count: 1 },
      ])
      .mockResolvedValueOnce([{ value: 11 }])
      .mockResolvedValueOnce([{ value: 0 }])

    vi.doMock('@/lib/utils/admin-auth', () => ({
      checkAdminAuth: vi.fn().mockResolvedValue({ isAuthorized: true, authMethod: 'api_key' }),
    }))
    vi.doMock('@/lib/db/client', () => ({ db, sql }))

    const { GET } = await import('../../app/api/admin/coverage/city/route.ts')

    const response = await GET(
      new NextRequest('https://reentrymap.org/api/admin/coverage/city?city=Salem&state=OR')
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.total_resources).toBe(11)
    expect(body.categories['mental-health']).toBe(1)
    expect(body.categories['general-support']).toBe(1)
    expect(body.gaps).not.toContain('mental-health')
    expect(body.gaps).not.toContain('general-support')
  })
})
