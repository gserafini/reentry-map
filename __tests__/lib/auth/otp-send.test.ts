// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ query: vi.fn(), random: vi.fn(() => 456789) }))
vi.mock('pg', () => ({
  Pool: class {
    query = mocks.query
  },
}))
vi.mock('node:crypto', () => ({ randomInt: mocks.random }))
import { POST } from '@/app/api/auth/otp/send/route'
afterEach(() => vi.unstubAllEnvs())
it('stores a cryptographically generated six-digit code', async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic@localhost/test')
  vi.stubEnv('TWILIO_ACCOUNT_SID', '')
  vi.stubEnv('TWILIO_AUTH_TOKEN', '')
  vi.stubEnv('TWILIO_PHONE_NUMBER', '')
  mocks.query.mockResolvedValue({ rows: [] })
  await POST(
    new NextRequest('https://example.test/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone: '5551234567' }),
    })
  )
  expect(mocks.random).toHaveBeenCalledWith(100000, 1000000)
  expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO phone_otps'), [
    '+15551234567',
    '456789',
  ])
})
