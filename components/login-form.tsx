'use client'

/**
 * Re-export LoginForm from NextAuth implementation
 *
 * This file provides backward compatibility for all existing imports
 * from '@/components/login-form' while using NextAuth.js internally.
 *
 * Migration note: The underlying implementation has been switched
 * from Supabase Auth to NextAuth.js with self-hosted PostgreSQL.
 */

export { LoginForm, LoginFormNextAuth } from './login-form-nextauth'
export type { LoginFormProps } from './login-form-nextauth'
