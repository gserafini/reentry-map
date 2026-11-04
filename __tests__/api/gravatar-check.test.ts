// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/gravatar/check/route'

describe('Gravatar check route', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('rejects oversized and malformed email values before calling Gravatar', async () => {
    const oversized = 'a'.repeat(250) + '@example.com'
    const response = await GET(
      new NextRequest(
        `https://reentrymap.org/api/gravatar/check?email=${encodeURIComponent(oversized)}`
      )
    )
    expect(response.status).toBe(400)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('bounds the outbound request and caches the existence result', async () => {
    const request = () =>
      new NextRequest('https://reentrymap.org/api/gravatar/check?email=cache-test@example.com')
    const first = await GET(request())
    const second = await GET(request())
    expect(await first.json()).toEqual({ exists: true })
    expect(await second.json()).toEqual({ exists: true })
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const options = vi.mocked(globalThis.fetch).mock.calls[0][1]
    expect(options).toMatchObject({ method: 'HEAD', redirect: 'error', cache: 'no-store' })
    expect(options?.signal).toBeInstanceOf(AbortSignal)
    expect(first.headers.get('Cache-Control')).toContain('max-age=300')
  })
})
