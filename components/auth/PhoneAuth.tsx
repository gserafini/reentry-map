'use client'

/**
 * Re-export PhoneAuth from NextAuth implementation
 *
 * This file provides backward compatibility for all existing imports
 * from '@/components/auth/PhoneAuth' while using NextAuth.js internally.
 *
 * Migration note: The underlying implementation has been switched
 * from Supabase Auth SMS OTP to NextAuth.js with Twilio SMS.
 */

export { PhoneAuth, PhoneAuthNextAuth } from './PhoneAuthNextAuth'
export type { PhoneAuthProps } from './PhoneAuthNextAuth'
