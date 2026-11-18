// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ query: vi.fn(), random: vi.fn(() => 456789) }))
vi.mock('pg', () => ({
  Pool: class {
    query = mocks.query
  },
}))
vi.mock('node:crypto', () => ({ randomInt: mocks.random }))

import { POST } from '@/app/api/auth/otp/send/route'

function sendOtp(phone?: string) {
  return POST(
    new NextRequest('https://example.test/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    })
  )
}

beforeEach(() => {
  mocks.query.mockReset()
  mocks.random.mockClear()
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic@localhost/test')
})
afterEach(() => vi.unstubAllEnvs())

it.each([
  { phone: undefined, error: 'Phone number is required' },
  { phone: '+442079460000', error: 'Invalid US phone number format' },
])(
  'rejects invalid input before consulting rate limits or generating a code',
  async ({ phone, error }) => {
    const response = await sendOtp(phone)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error })
    expect(mocks.query).not.toHaveBeenCalled()
    expect(mocks.random).not.toHaveBeenCalled()
  }
)

it('checks the normalized phone against the rate limit before storing another code', async () => {
  mocks.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })

  const response = await sendOtp('+1 (415) 555-0138')

  expect(response.status).toBe(429)
  expect(mocks.query).toHaveBeenCalledExactlyOnceWith(
    expect.stringContaining('SELECT id FROM phone_otps'),
    ['+14155550138']
  )
  expect(mocks.random).not.toHaveBeenCalled()
})

it('stores a cryptographically generated code without returning it when production SMS is unavailable', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('TWILIO_ACCOUNT_SID', '')
  vi.stubEnv('TWILIO_AUTH_TOKEN', '')
  vi.stubEnv('TWILIO_PHONE_NUMBER', '')
  mocks.query.mockResolvedValue({ rows: [] })

  const response = await sendOtp('5551234567')

  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'SMS service not configured' })
  expect(mocks.random).toHaveBeenCalledWith(100000, 1000000)
  expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO phone_otps'), [
    '+15551234567',
    '456789',
  ])
})
