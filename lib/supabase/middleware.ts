import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Update session using NextAuth JWT token
 *
 * Migrated from Supabase auth.getClaims() to NextAuth getToken()
 * Validates session and redirects unauthenticated users for protected routes
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  // Get NextAuth JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/heroui-test',
    '/auth',
    '/login',
    '/api/auth',
    '/resources',
    '/r/',
    '/category',
    '/tag',
    '/search',
    '/suggest-resource',
    '/api/resources',
    '/api/gravatar',
    '/api/location',
    '/api/analytics',
  ]

  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  // Also allow static assets
  const isStaticAsset =
    request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.includes('.') // files with extensions

  if (!token && !isPublicRoute && !isStaticAsset) {
    // No valid session, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    // Store the original URL to redirect back after login
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return response
}
