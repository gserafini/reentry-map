import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getTrustedClientIP } from '@/lib/utils/client-ip'

// Rate limit configurations per route pattern
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  // Auth endpoints - strict limits to prevent brute force
  '/api/auth/signup': { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  '/api/auth/otp/send': { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  '/api/auth/callback/': { limit: 5, windowMs: 15 * 60 * 1000 },
  '/api/auth/signin': { limit: 5, windowMs: 15 * 60 * 1000 },

  // Public write endpoints
  '/api/suggestions': { limit: 10, windowMs: 60 * 1000 }, // 10 per min
  '/api/updates': { limit: 10, windowMs: 60 * 1000 },
  '/api/reviews': { limit: 10, windowMs: 60 * 1000 },
  '/api/ratings': { limit: 20, windowMs: 60 * 1000 },
  '/api/resources/suggest-batch': { limit: 5, windowMs: 60 * 1000 },
  '/api/analytics/batch': { limit: 30, windowMs: 60 * 1000 },

  // Public GET endpoints that can trigger network or database work
  '/api/gravatar/check': { limit: 30, windowMs: 60 * 1000 },
  '/api/location/ip': { limit: 30, windowMs: 60 * 1000 },
  '/api/analytics/health': { limit: 10, windowMs: 60 * 1000 },

  // General API - generous but bounded
  '/api/': { limit: 60, windowMs: 60 * 1000 }, // 60 per min default
}

function findRateLimit(pathname: string): { limit: number; windowMs: number } | null {
  // Check specific routes first (longest match wins)
  const sortedKeys = Object.keys(RATE_LIMITS).sort((a, b) => b.length - a.length)
  for (const pattern of sortedKeys) {
    if (pathname.startsWith(pattern)) {
      return RATE_LIMITS[pattern]
    }
  }
  return null
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy - send origin for same-origin, nothing for cross-origin
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // HSTS - enforce HTTPS (1 year, include subdomains)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // Permissions policy - disable unused browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  )

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Scripts: self + Google Maps + inline for Next.js hydration
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
      // Styles: self + inline for MUI/Tailwind + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Images: self + data URIs + Google Maps tiles + Gravatar
      "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.gravatar.com https://www.gravatar.com",
      // Fonts: self + Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Workers: Google Maps uses blob workers for WebGL
      "worker-src 'self' blob:",
      // Connect: self + Google Maps APIs + tiles + analytics
      "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.gstatic.com https://maps.googleapis.com",
      // Frame: deny embedding
      "frame-ancestors 'none'",
      // Base URI restriction
      "base-uri 'self'",
      // Form action restriction
      "form-action 'self'",
    ].join('; ')
  )

  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Limit mutating API calls generally, plus selected GET routes that perform
  // database or outbound network work.
  const isApiRoute = pathname.startsWith('/api/')
  const isMutatingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
  const isExpensiveGet =
    request.method === 'GET' &&
    ['/api/gravatar/check', '/api/location/ip', '/api/analytics/health'].some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  const isAuthCallback = pathname.startsWith('/api/auth/callback/')

  if (isApiRoute && (isMutatingMethod || isExpensiveGet || isAuthCallback)) {
    const config = findRateLimit(pathname)
    if (config) {
      const ip = getTrustedClientIP(request.headers)
      const key = `${ip}:${pathname}`
      const result = rateLimit(key, config.limit, config.windowMs)

      if (!result.allowed) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
              status: 429,
              headers: {
                'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
                'X-RateLimit-Limit': String(config.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
              },
            }
          )
        )
      }
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next()
  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    // Match all routes except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|workbox-|manifest.json).*)',
  ],
}
