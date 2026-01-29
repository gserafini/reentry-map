'use client'

/**
 * Re-export useAuth from NextAuth implementation
 *
 * This file provides backward compatibility for all existing imports
 * from '@/lib/hooks/useAuth' while using NextAuth.js internally.
 *
 * Migration note: The underlying implementation has been switched
 * from Supabase Auth to NextAuth.js with self-hosted PostgreSQL.
 */

export { useAuth, useAuthNextAuth } from './useAuthNextAuth'
export type { UseAuthResult, AuthUser } from './useAuthNextAuth'
