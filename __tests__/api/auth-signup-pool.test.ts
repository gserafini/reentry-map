// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getSignupPoolOptions } from '@/lib/utils/signup-db-options'

describe('signup PostgreSQL connection options', () => {
  it.each([
    'postgres://user:pass@localhost:5432/app',
    'postgres://user:pass@127.0.0.1:5432/app',
    'postgres://user:pass@[::1]:5432/app',
  ])('disables TLS only for loopback host %s', (connectionString) => {
    expect(getSignupPoolOptions(connectionString).ssl).toBe(false)
  })

  it('requires certificate validation for remote TLS connections', () => {
    expect(getSignupPoolOptions('postgres://user:pass@db.example.test/app').ssl).toEqual({
      rejectUnauthorized: true,
    })
  })

  it('does not let TLS query options disable remote certificate validation', () => {
    const options = getSignupPoolOptions(
      'postgres://user:pass@db.example.test/app?sslmode=no-verify&ssl=true'
    )
    expect(options.ssl).toEqual({ rejectUnauthorized: true })
    expect(options.connectionString).not.toMatch(/ssl(?:mode)?=/i)
  })

  it('rejects malformed connection strings', () => {
    expect(() => getSignupPoolOptions('not-a-url')).toThrow()
  })
})
