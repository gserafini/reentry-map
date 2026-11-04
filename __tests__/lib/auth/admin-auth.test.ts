// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ token: vi.fn(), user: vi.fn(), compare: vi.fn() }))
vi.mock('next-auth/jwt', () => ({ getToken: mocks.token }))
vi.mock('@/lib/auth/config', () => ({ getUserById: mocks.user }))
vi.mock('@/lib/env', () => ({ env: { ADMIN_API_KEY: 'synthetic-admin-key' } }))
vi.mock('node:crypto', () => ({ timingSafeEqual: mocks.compare }))
import { checkAdminAuth } from '@/lib/utils/admin-auth'
describe('admin authorization revocation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.token.mockResolvedValue({ id: 'admin', isAdmin: true })
  })
  it.each([null, { id: 'admin', is_admin: false }])('rejects stale role for %s', async (user) => {
    mocks.user.mockResolvedValue(user)
    expect(
      (await checkAdminAuth(new NextRequest('https://example.test/api/admin/users'))).isAuthorized
    ).toBe(false)
  })
  it('allows the current database admin role', async () => {
    mocks.token.mockResolvedValue({ id: 'admin', isAdmin: false })
    mocks.user.mockResolvedValue({ id: 'admin', is_admin: true })
    expect(
      (await checkAdminAuth(new NextRequest('https://example.test/api/admin/users'))).isAuthorized
    ).toBe(true)
  })
  it('uses timing safe API key comparison and bypasses session lookup', async () => {
    mocks.compare.mockReturnValue(true)
    const result = await checkAdminAuth(
      new NextRequest('https://example.test/api/admin/users', {
        headers: { 'x-admin-api-key': 'synthetic-admin-key' },
      })
    )
    expect(result).toEqual({ isAuthorized: true, authMethod: 'api_key' })
    expect(mocks.compare).toHaveBeenCalledOnce()
    expect(mocks.token).not.toHaveBeenCalled()
  })
  it('rejects unequal-length keys without calling comparator', async () => {
    const result = await checkAdminAuth(
      new NextRequest('https://example.test/api/admin/users', {
        headers: { 'x-admin-api-key': 'short' },
      })
    )
    expect(result.isAuthorized).toBe(false)
    expect(mocks.compare).not.toHaveBeenCalled()
  })
})
