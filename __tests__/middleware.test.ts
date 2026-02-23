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
  headers: Record<string, string> = {}
): NextRequest {
  const headersMap = new Map(Object.entries(headers))
  return {
    nextUrl: { pathname },
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

  describe('rate limiting', () => {
    it('does not rate limit GET requests', () => {
      const request = createMockRequest('/api/resources', 'GET')
      middleware(request)
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

    it('uses default limits for general API routes', () => {
      const request = createMockRequest('/api/something', 'POST', {
        'x-forwarded-for': '1.2.3.4',
      })
      middleware(request)
      // Should be called with default limits (60 per min)
      expect(mockRateLimit).toHaveBeenCalledWith(expect.any(String), 60, 60 * 1000)
    })

    it('extracts client IP from x-forwarded-for header', () => {
      const request = createMockRequest('/api/suggestions', 'POST', {
        'x-forwarded-for': '203.0.113.1, 70.41.3.18',
      })
      middleware(request)
      const callArgs = mockRateLimit.mock.calls[0]
      expect(callArgs[0]).toContain('203.0.113.1')
    })

    it('falls back to x-real-ip header', () => {
      const request = createMockRequest('/api/suggestions', 'POST', {
        'x-real-ip': '198.51.100.1',
      })
      middleware(request)
      const callArgs = mockRateLimit.mock.calls[0]
      expect(callArgs[0]).toContain('198.51.100.1')
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
