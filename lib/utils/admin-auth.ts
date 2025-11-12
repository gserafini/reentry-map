import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Admin authentication result
 */
export interface AdminAuthResult {
  isAuthorized: boolean
  authMethod: 'session' | 'api_key' | 'none'
  userId?: string
  error?: string
  /**
   * Get a Supabase client with appropriate permissions.
   * For API key auth, returns service role client (bypasses RLS).
   * For session auth, returns regular client with user context.
   */
  getClient: () => Awaited<ReturnType<typeof createSupabaseClient>>
}

/**
 * Check if request is authenticated as admin
 *
 * Supports two authentication methods:
 * 1. Session-based (Supabase auth) - for browser/Claude Web
 * 2. API key (x-admin-api-key header) - for Claude Code/scripts
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
        getClient: () => {
          // Use service role client for API key auth (bypasses RLS)
          if (!env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
          }
          return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          })
        },
      }
    } else {
      return {
        isAuthorized: false,
        authMethod: 'none',
        error: 'Invalid API key',
        getClient: () => {
          throw new Error('Not authorized')
        },
      }
    }
  }

  // Fall back to session-based auth
  const supabase = await createSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      isAuthorized: false,
      authMethod: 'none',
      error: 'Not authenticated',
      getClient: () => {
        throw new Error('Not authenticated')
      },
    }
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    return {
      isAuthorized: false,
      authMethod: 'session',
      error: 'Not authorized - admin access required',
      getClient: () => {
        throw new Error('Not authorized')
      },
    }
  }

  return {
    isAuthorized: true,
    authMethod: 'session',
    userId: user.id,
    getClient: () => supabase,
  }
}
