// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ pool: vi.fn(), query: vi.fn().mockResolvedValue({ rows: [] }) }))
vi.mock('pg', () => ({
  Pool: class {
    constructor(options: object) {
      mocks.pool(options)
    }
    query = mocks.query
  },
}))
afterEach(() => vi.unstubAllEnvs())
it.each([
  ['postgresql://user@localhost/test', false],
  ['postgresql://user@127.0.0.1/test', false],
  ['postgresql://user@[::1]/test', false],
  ['postgresql://user@remote.example/test', { rejectUnauthorized: true }],
  ['postgresql://localhost@remote.example/test', { rejectUnauthorized: true }],
])('uses authenticated TLS only for remote hostname: %s', async (url, ssl) => {
  vi.resetModules()
  mocks.pool.mockClear()
  vi.stubEnv('DATABASE_URL', url)
  vi.stubEnv('TWILIO_ACCOUNT_SID', '')
  vi.stubEnv('TWILIO_AUTH_TOKEN', '')
  vi.stubEnv('TWILIO_PHONE_NUMBER', '')
  const auth = await import('@/lib/auth/config')
  await auth.getUserById('synthetic')
  const otp = await import('@/app/api/auth/otp/send/route')
  await otp.POST(
    new NextRequest('https://example.test/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone: '5551234567' }),
    })
  )
  expect(mocks.pool).toHaveBeenCalledTimes(2)
  for (const [options] of mocks.pool.mock.calls)
    expect(options).toEqual(expect.objectContaining({ ssl }))
})
