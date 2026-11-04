// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ admin: vi.fn(), sql: vi.fn() }))
vi.mock('@/lib/utils/admin-auth', () => ({ checkAdminAuth: mocks.admin }))
vi.mock('@/lib/db/client', () => ({ sql: mocks.sql }))

import { GET } from '@/app/api/analytics/health/route'

describe('analytics health route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.admin.mockResolvedValue({ isAuthorized: false })
  })

  it('requires admin authentication before querying analytics', async () => {
    const response = await GET(new NextRequest('https://reentrymap.org/api/analytics/health'))
    expect(response.status).toBe(401)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it('does not return database error details to an authorized caller', async () => {
    mocks.admin.mockResolvedValue({ isAuthorized: true, authMethod: 'api_key' })
    mocks.sql.mockRejectedValue(new Error('secret db host and table name'))
    const response = await GET(new NextRequest('https://reentrymap.org/api/analytics/health'))
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).not.toHaveProperty('error')
    expect(body.message).toBe('Failed to retrieve analytics health metrics')
  })
})
