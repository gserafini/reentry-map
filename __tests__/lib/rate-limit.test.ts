import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('allows first request within limit', () => {
    const result = rateLimit('test-key-1', 5, 60000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('tracks remaining count correctly', () => {
    const key = 'test-remaining-' + Date.now()
    const r1 = rateLimit(key, 3, 60000)
    expect(r1.remaining).toBe(2)

    const r2 = rateLimit(key, 3, 60000)
    expect(r2.remaining).toBe(1)

    const r3 = rateLimit(key, 3, 60000)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests exceeding limit', () => {
    const key = 'test-block-' + Date.now()
    // Use up all 3 allowed requests
    rateLimit(key, 3, 60000)
    rateLimit(key, 3, 60000)
    rateLimit(key, 3, 60000)

    // 4th request should be blocked
    const result = rateLimit(key, 3, 60000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('returns resetAt timestamp in the future', () => {
    const before = Date.now()
    const result = rateLimit('test-reset-' + Date.now(), 5, 60000)
    expect(result.resetAt).toBeGreaterThan(before)
    expect(result.resetAt).toBeLessThanOrEqual(before + 60000 + 100) // small tolerance
  })

  it('resets after window expires', () => {
    const key = 'test-expire-' + Date.now()

    // Use all requests
    rateLimit(key, 1, 100)
    const blocked = rateLimit(key, 1, 100)
    expect(blocked.allowed).toBe(false)

    // Mock time advancing past the window
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 200)

    const result = rateLimit(key, 1, 100)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0) // 1 limit, used 1
  })

  it('uses different counters for different keys', () => {
    const key1 = 'user1-' + Date.now()
    const key2 = 'user2-' + Date.now()

    // Exhaust key1
    rateLimit(key1, 1, 60000)
    const blocked = rateLimit(key1, 1, 60000)
    expect(blocked.allowed).toBe(false)

    // key2 should still be allowed
    const result = rateLimit(key2, 1, 60000)
    expect(result.allowed).toBe(true)
  })

  it('correctly handles edge case of limit=1', () => {
    const key = 'test-limit1-' + Date.now()
    const r1 = rateLimit(key, 1, 60000)
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(0)

    const r2 = rateLimit(key, 1, 60000)
    expect(r2.allowed).toBe(false)
    expect(r2.remaining).toBe(0)
  })

  it('blocked response includes correct resetAt for retry-after calculation', () => {
    const key = 'test-retry-' + Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes

    rateLimit(key, 1, windowMs)
    const blocked = rateLimit(key, 1, windowMs)

    expect(blocked.allowed).toBe(false)
    // resetAt should be approximately now + windowMs
    const retryAfterSeconds = Math.ceil((blocked.resetAt - Date.now()) / 1000)
    expect(retryAfterSeconds).toBeGreaterThan(0)
    expect(retryAfterSeconds).toBeLessThanOrEqual(15 * 60)
  })
})
