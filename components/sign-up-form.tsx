'use client'

/**
 * Re-export SignUpForm from NextAuth implementation
 *
 * This file provides backward compatibility for all existing imports
 * from '@/components/sign-up-form' while using NextAuth.js internally.
 *
 * Migration note: The underlying implementation has been switched
 * from Supabase Auth to NextAuth.js with self-hosted PostgreSQL.
 */

export { SignUpForm, SignUpFormNextAuth } from './sign-up-form-nextauth'
export type { SignUpFormProps } from './sign-up-form-nextauth'
