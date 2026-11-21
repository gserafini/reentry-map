import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to declare mock variables available during mock factory hoisting
const { mockRateLimit, mockHeaders, mockNextResponse } = vi.hoisted(() => {
  const mockHeaders = new Map<string, string>()
  return {
    mockRateLimit: vi.fn(),
    mockHeaders,
    mockNextResponse: {
      json: vi.fn(
        (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
          headers: {
            set: (key: string, value: string) => mockHeaders.set(key, value),
            get: (key: string) => mockHeaders.get(key),
          },
          status: init?.status || 200,
          body,
        })
      ),
      next: vi.fn(() => ({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
      })),
      redirect: vi.fn((url: URL, status = 307) => ({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
        status,
        location: url.toString(),
      })),
    },
  }
})

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('next/server', () => ({
  NextResponse: mockNextResponse,
}))

// Now import middleware
import { middleware } from '@/middleware'
import type { NextRequest } from 'next/server'

function createMockRequest(
  pathname: string,
  method = 'GET',
  headers: Record<string, string> = {},
  requestUrl = `https://reentrymap.org${pathname}`
): NextRequest {
  const nextUrl = new URL(requestUrl)
  // Model the proxy's overwritten TLS marker; explicit headers can exercise
  // spoofed/conflicting client values.
  const headersMap = new Map(
    Object.entries({ 'x-https': nextUrl.protocol === 'https:' ? '1' : '0', ...headers })
  )
  return {
    nextUrl,
    method,
    headers: {
      get: (key: string) => headersMap.get(key) || null,
    },
  } as unknown as NextRequest
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeaders.clear()
    mockRateLimit.mockReturnValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 })
  })

  describe('security headers', () => {
    it('adds X-Frame-Options DENY to all responses', () => {
      const request = createMockRequest('/')
      middleware(request)
      expect(mockHeaders.get('X-Frame-Options')).toBe('DENY')
    })

    it('adds X-Content-Type-Options nosniff', () => {
      const request = createMockRequest('/')
      middleware(request)
      expect(mockHeaders.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it('adds HSTS header', () => {
      const request = createMockRequest('/')
      middleware(request)
      expect(mockHeaders.get('Strict-Transport-Security')).toBe(
        'max-age=31536000; includeSubDomains'
      )
    })

    it('adds Referrer-Policy', () => {
      const request = createMockRequest('/')
      middleware(request)
      expect(mockHeaders.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })

    it('adds Permissions-Policy disabling camera and microphone', () => {
      const request = createMockRequest('/')
      middleware(request)
      const policy = mockHeaders.get('Permissions-Policy')
      expect(policy).toContain('camera=()')
      expect(policy).toContain('microphone=()')
      expect(policy).toContain('geolocation=(self)')
    })

    it('adds Content-Security-Policy', () => {
      const request = createMockRequest('/')
      middleware(request)
      const csp = mockHeaders.get('Content-Security-Policy')
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain('maps.googleapis.com')
      expect(csp).toContain("frame-ancestors 'none'")
    })

    it('adds X-XSS-Protection', () => {
      const request = createMockRequest('/')
      middleware(request)
      expect(mockHeaders.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('adds security headers to non-API routes', () => {
      const request = createMockRequest('/resources')
      middleware(request)
      expect(mockHeaders.get('X-Frame-Options')).toBe('DENY')
      expect(mockHeaders.get('X-Content-Type-Options')).toBe('nosniff')
    })
  })

  describe('canonical host redirects', () => {
    it.each(['reentrymap.com', 'www.reentrymap.com', 'www.reentrymap.org'])(
      'permanently redirects %s to the canonical origin while preserving path and query',
      (host) => {
        const request = createMockRequest(
          '/resources/ca?category=housing&page=2',
          'GET',
          { host },
          `https://${host}/resources/ca?category=housing&page=2`
        )
        const response = middleware(request)
        expect(mockNextResponse.redirect).toHaveBeenCalledWith(
          new URL('https://reentrymap.org/resources/ca?category=housing&page=2'),
          308
        )
        expect(response).toMatchObject({ status: 308 })
      }
    )

    it('permanently upgrades the canonical host from HTTP without losing the query', () => {
      middleware(
        createMockRequest(
          '/?q=jobs',
          'GET',
          { host: 'reentrymap.org' },
          'http://reentrymap.org/?q=jobs'
        )
      )
      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        new URL('https://reentrymap.org/?q=jobs'),
        308
      )
    })

    it.each([
      ['reentrymap.org', '0', 'http://reentrymap.org:3007/ca/oakland?page=2'],
      ['www.reentrymap.com', '1', 'http://www.reentrymap.com:3007/ca/oakland?page=2'],
    ])('removes internal proxy ports for %s', (host, secure, requestUrl) => {
      middleware(
        createMockRequest('/ca/oakland?page=2', 'GET', { host, 'x-https': secure }, requestUrl)
      )
      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        new URL('https://reentrymap.org/ca/oakland?page=2'),
        308
      )
    })

    describe('legacy /home (WordPress-era URL still listed by Brave)', () => {
      it('permanently redirects /home on the canonical host to the home page, keeping the query', () => {
        middleware(
          createMockRequest(
            '/home',
            'GET',
            { host: 'reentrymap.org' },
            'https://reentrymap.org/home?utm_source=brave'
          )
        )
        expect(mockNextResponse.redirect).toHaveBeenCalledWith(
          new URL('https://reentrymap.org/?utm_source=brave'),
          308
        )
      })

      it.each([
        ['www.reentrymap.org', 'http://www.reentrymap.org/home/?q=jobs'],
        ['reentrymap.com', 'https://reentrymap.com/home?q=jobs'],
        ['reentrymap.org', 'http://reentrymap.org:3007/home?q=jobs'],
      ])(
        'sends %s /home straight to the canonical home page in one hop (%s)',
        (host, requestUrl) => {
          const { pathname } = new URL(requestUrl)
          const secure = requestUrl.startsWith('https') ? '1' : '0'
          middleware(createMockRequest(pathname, 'GET', { host, 'x-https': secure }, requestUrl))
          expect(mockNextResponse.redirect).toHaveBeenCalledTimes(1)
          expect(mockNextResponse.redirect).toHaveBeenCalledWith(
            new URL('https://reentrymap.org/?q=jobs'),
            308
          )
        }
      )

      it('stays on the public staging host, never the internal proxy port', () => {
        middleware(
          createMockRequest(
            '/home',
            'GET',
            { host: 'staging.reentrymap.org', 'x-https': '1' },
            'http://localhost:3009/home?x=1'
          )
        )
        expect(mockNextResponse.redirect).toHaveBeenCalledWith(
          new URL('https://staging.reentrymap.org/?x=1'),
          308
        )
      })

      it.each(['/homeless-services', '/home/abc', '/ca/home'])(
        'does not redirect %s',
        (pathname) => {
          middleware(createMockRequest(pathname, 'GET', { host: 'reentrymap.org', 'x-https': '1' }))
          expect(mockNextResponse.redirect).not.toHaveBeenCalled()
        }
      )

      it('does not redirect /home for an unrecognized Host', () => {
        middleware(
          createMockRequest(
            '/home',
            'GET',
            { host: 'evil.example', 'x-https': '1' },
            'https://evil.example/home'
          )
        )
        expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      })
    })

    it('does not redirect the canonical HTTPS host', () => {
      middleware(createMockRequest('/', 'GET', { host: 'reentrymap.org', 'x-https': '1' }))
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalled()
    })

    it('uses Apache’s SSL marker to avoid a redirect loop after proxy TLS termination', () => {
      middleware(
        createMockRequest(
          '/',
          'GET',
          { host: 'reentrymap.org', 'x-https': '1' },
          'http://reentrymap.org/'
        )
      )
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalled()
    })

    it('does not trust a request URL protocol derived from client forwarded-proto headers', () => {
      // Next can construct nextUrl with https from X-Forwarded-Proto. On the
      // Apache HTTP vhost, X-HTTPS: 0 is the trusted overwrite that distinguishes it.
      middleware(
        createMockRequest(
          '/',
          'GET',
          {
            host: 'reentrymap.org',
            'x-forwarded-proto': 'https',
            'x-https': '0',
          },
          'https://reentrymap.org/'
        )
      )
      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        new URL('https://reentrymap.org/'),
        308
      )
    })

    it.each(['staging.reentrymap.org', 'localhost:3000', 'preview.example.net'])(
      'leaves non-production host %s untouched even when forwarded host claims canonical',
      (host) => {
        middleware(
          createMockRequest(
            '/',
            'GET',
            {
              host,
              'x-forwarded-host': 'www.reentrymap.com',
            },
            `http://${host}/`
          )
        )
        expect(mockNextResponse.redirect).not.toHaveBeenCalled()
        expect(mockNextResponse.next).toHaveBeenCalled()
      }
    )
  })

  describe('rate limiting', () => {
    it('does not rate limit ordinary GET requests', () => {
      const request = createMockRequest('/api/resources', 'GET')
      middleware(request)
      expect(mockRateLimit).not.toHaveBeenCalled()
    })

    it('does not rate limit routine NextAuth session polling', () => {
      middleware(createMockRequest('/api/auth/session', 'GET'))
      expect(mockRateLimit).not.toHaveBeenCalled()
    })

    it('does not rate limit non-API routes', () => {
      const request = createMockRequest('/resources', 'POST')
      middleware(request)
      expect(mockRateLimit).not.toHaveBeenCalled()
    })

    it('rate limits POST requests to API routes', () => {
      const request = createMockRequest('/api/suggestions', 'POST')
      middleware(request)
      expect(mockRateLimit).toHaveBeenCalled()
    })

    it('rate limits PUT requests to API routes', () => {
      const request = createMockRequest('/api/resources/123', 'PUT')
      middleware(request)
      expect(mockRateLimit).toHaveBeenCalled()
    })

    it('rate limits DELETE requests to API routes', () => {
      const request = createMockRequest('/api/resources/123', 'DELETE')
      middleware(request)
      expect(mockRateLimit).toHaveBeenCalled()
    })

    it('rate limits PATCH requests to API routes', () => {
      const request = createMockRequest('/api/resources/123', 'PATCH')
      middleware(request)
      expect(mockRateLimit).toHaveBeenCalled()
    })

    it('returns 429 when rate limit exceeded', () => {
      mockRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60000,
      })
      const request = createMockRequest('/api/suggestions', 'POST')
      middleware(request)
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Too many requests. Please try again later.' },
        expect.objectContaining({ status: 429 })
      )
    })

    it('includes Retry-After header when rate limited', () => {
      mockRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60000,
      })
      const request = createMockRequest('/api/suggestions', 'POST')
      middleware(request)
      const jsonCall = mockNextResponse.json.mock.calls[0]
      const headers = jsonCall[1]?.headers
      expect(headers).toHaveProperty('Retry-After')
      expect(headers).toHaveProperty('X-RateLimit-Limit')
      expect(headers).toHaveProperty('X-RateLimit-Remaining', '0')
    })

    it('uses stricter limits for auth endpoints', () => {
      const request = createMockRequest('/api/auth/signup', 'POST', {
        'x-forwarded-for': '1.2.3.4',
      })
      middleware(request)
      // Should be called with auth limits (5 per 15 min)
      expect(mockRateLimit).toHaveBeenCalledWith(expect.any(String), 5, 15 * 60 * 1000)
    })

    it('rate limits auth callbacks more strictly than general API requests', () => {
      middleware(createMockRequest('/api/auth/callback/credentials', 'POST'))
      expect(mockRateLimit).toHaveBeenCalledWith(expect.any(String), 5, 15 * 60 * 1000)
    })

    it('rate limits sign-in POSTs more strictly than general API requests', () => {
      middleware(createMockRequest('/api/auth/signin/credentials', 'POST'))
      expect(mockRateLimit).toHaveBeenCalledWith(expect.any(String), 5, 15 * 60 * 1000)
    })

    it.each([
      ['/api/gravatar/check', 30],
      ['/api/location/ip', 30],
      ['/api/analytics/health', 10],
    ])('rate limits GET requests to %s', (path, limit) => {
      middleware(createMockRequest(path, 'GET'))
      expect(mockRateLimit).toHaveBeenCalledWith(expect.any(String), limit, 60 * 1000)
    })

    it('uses default limits for general API routes', () => {
      const request = createMockRequest('/api/something', 'POST', {
        'x-forwarded-for': '1.2.3.4',
      })
      middleware(request)
      // Should be called with default limits (60 per min)
      expect(mockRateLimit).toHaveBeenCalledWith(expect.any(String), 60, 60 * 1000)
    })

    it('uses the trusted rightmost Apache X-Forwarded-For address', () => {
      const request = createMockRequest('/api/suggestions', 'POST', {
        'x-forwarded-for': '203.0.113.1, 70.41.3.18',
      })
      middleware(request)
      const callArgs = mockRateLimit.mock.calls[0]
      expect(callArgs[0]).toContain('70.41.3.18')
    })

    it('does not trust x-real-ip when the proxy header is missing', () => {
      const request = createMockRequest('/api/suggestions', 'POST', {
        'x-real-ip': '198.51.100.1',
      })
      middleware(request)
      const callArgs = mockRateLimit.mock.calls[0]
      expect(callArgs[0]).toContain('unknown')
    })

    it('uses unknown for a malformed proxy address', () => {
      middleware(
        createMockRequest('/api/suggestions', 'POST', {
          'x-forwarded-for': 'spoofed, also-not-an-ip',
        })
      )
      expect(mockRateLimit.mock.calls[0][0]).toContain('unknown')
    })

    it('allows requests within rate limit', () => {
      mockRateLimit.mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 })
      const request = createMockRequest('/api/suggestions', 'POST')
      middleware(request)
      expect(mockNextResponse.next).toHaveBeenCalled()
    })
  })

  describe('CSP Google Maps compatibility', () => {
    it('allows Google Maps scripts in CSP', () => {
      middleware(createMockRequest('/'))
      const csp = mockHeaders.get('Content-Security-Policy')
      expect(csp).toContain('https://maps.googleapis.com')
      expect(csp).toContain('https://maps.gstatic.com')
    })

    it('allows blob workers for Google Maps WebGL', () => {
      middleware(createMockRequest('/'))
      const csp = mockHeaders.get('Content-Security-Policy')
      expect(csp).toContain("worker-src 'self' blob:")
    })

    it('allows Google Maps tile connections', () => {
      middleware(createMockRequest('/'))
      const csp = mockHeaders.get('Content-Security-Policy')
      expect(csp).toContain('https://*.gstatic.com')
    })

    it('allows Google Fonts', () => {
      middleware(createMockRequest('/'))
      const csp = mockHeaders.get('Content-Security-Policy')
      expect(csp).toContain('https://fonts.googleapis.com')
      expect(csp).toContain('https://fonts.gstatic.com')
    })
  })
})
