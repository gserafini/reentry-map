import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { env } from '@/lib/env'

/**
 * Admin authentication result
 *
 * Admin routes use Drizzle/postgres.js directly.
 */
export interface AdminAuthResult {
  isAuthorized: boolean
  authMethod: 'session' | 'api_key' | 'none'
  userId?: string
  error?: string
}

/**
 * Check if request is authenticated as admin
 *
 * Supports two authentication methods:
 * 1. Session-based (NextAuth.js) - for browser/Claude Web
 * 2. API key (x-admin-api-key header) - for Claude Code/scripts
 *
 * Uses NextAuth.js for session authentication
 *
 * @param request Next.js request object
 * @returns AdminAuthResult with authorization status
 */
export async function checkAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  // Check for API key first (faster)
  const apiKey = request.headers.get('x-admin-api-key')

  if (apiKey && env.ADMIN_API_KEY) {
    // Constant-time comparison to prevent timing attacks
    const providedKey = Buffer.from(apiKey)
    const validKey = Buffer.from(env.ADMIN_API_KEY)

    if (providedKey.length === validKey.length && providedKey.equals(validKey)) {
      return {
        isAuthorized: true,
        authMethod: 'api_key',
      }
    } else {
      return {
        isAuthorized: false,
        authMethod: 'none',
        error: 'Invalid API key',
      }
    }
  }

  // Fall back to NextAuth session-based auth
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token || !token.id) {
    return {
      isAuthorized: false,
      authMethod: 'none',
      error: 'Not authenticated',
    }
  }

  // Check if user is admin from the token
  // The isAdmin flag is populated in the JWT callback from the database
  if (!token.isAdmin) {
    return {
      isAuthorized: false,
      authMethod: 'session',
      userId: token.id as string,
      error: 'Not authorized - admin access required',
    }
  }

  // User is authenticated and is admin
  return {
    isAuthorized: true,
    authMethod: 'session',
    userId: token.id as string,
  }
}
