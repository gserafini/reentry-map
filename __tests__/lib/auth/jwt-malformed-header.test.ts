// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { encode, getToken } from 'next-auth/jwt'
import { checkAdminAuth } from '@/lib/utils/admin-auth'

vi.mock('@/lib/env', () => ({ env: { ADMIN_API_KEY: undefined } }))

const secret = 'test-only-jwt-regression-secret'

function request(authorization: string) {
  return new NextRequest('https://example.test/api/admin/resources', {
    headers: { authorization },
  })
}

describe('real NextAuth JWT authorization parsing', () => {
  it.each(['Bearer %', 'Bearer %GG', 'Bearer %E0%A4%A'])(
    'rejects malformed authorization %s as unauthenticated',
    async (authorization) => {
      await expect(getToken({ req: request(authorization), secret })).resolves.toBeNull()
    }
  )

  it('returns an unauthenticated admin result for malformed bearer input', async () => {
    await expect(checkAdminAuth(request('Bearer %'))).resolves.toMatchObject({
      isAuthorized: false,
      authMethod: 'none',
      error: 'Not authenticated',
    })
  })

  it('rejects a well-formed but invalid bearer token', async () => {
    await expect(
      getToken({ req: request('Bearer ordinary-invalid-token'), secret })
    ).resolves.toBeNull()
  })

  it('continues accepting a valid encrypted session token', async () => {
    const token = await encode({ token: { sub: 'test-user', isAdmin: true }, secret })
    await expect(
      getToken({ req: request('Bearer ' + encodeURIComponent(token)), secret })
    ).resolves.toMatchObject({ sub: 'test-user', isAdmin: true })
  })
})
