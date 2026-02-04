'use client'

/**
 * Re-export SignUpForm from NextAuth implementation
 *
 * This file provides backward compatibility for all existing imports
 * from '@/components/sign-up-form' while using NextAuth.js internally.
 *
 * Uses NextAuth.js with self-hosted PostgreSQL.
 */

export { SignUpForm, SignUpFormNextAuth } from './sign-up-form-nextauth'
export type { SignUpFormProps } from './sign-up-form-nextauth'
