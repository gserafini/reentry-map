'use client'

/**
 * Re-export useAuth from NextAuth implementation
 *
 * This file provides backward compatibility for all existing imports
 * from '@/lib/hooks/useAuth' while using NextAuth.js internally.
 *
 * Uses NextAuth.js with self-hosted PostgreSQL.
 */

export { useAuth, useAuthNextAuth } from './useAuthNextAuth'
export type { UseAuthResult, AuthUser } from './useAuthNextAuth'
