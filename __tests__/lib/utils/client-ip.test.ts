import { describe, expect, it } from 'vitest'
import { getTrustedClientIP } from '@/lib/utils/client-ip'
import { getClientIP } from '@/lib/utils/geoip'

describe('getTrustedClientIP', () => {
  it('uses and validates the rightmost Apache forwarded address', () => {
    expect(
      getTrustedClientIP(new Headers({ 'x-forwarded-for': '198.51.100.9, 2001:db8::5' }))
    ).toBe('2001:db8::5')
  })

  it.each([undefined, '198.51.100.9, attacker', 'localhost', '999.1.1.1'])(
    'returns unknown when the trusted proxy address is missing or invalid: %s',
    (value) => {
      const headers = new Headers()
      if (value) headers.set('x-forwarded-for', value)
      headers.set('x-real-ip', '198.51.100.12')
      expect(getTrustedClientIP(headers)).toBe('unknown')
    }
  )

  it('keeps the GeoIP helper on the same trusted proxy contract', () => {
    expect(getClientIP(new Headers({ 'x-forwarded-for': '198.51.100.9, 203.0.113.12' }))).toBe(
      '203.0.113.12'
    )
    expect(getClientIP(new Headers({ 'x-real-ip': '198.51.100.9' }))).toBeNull()
  })
})
