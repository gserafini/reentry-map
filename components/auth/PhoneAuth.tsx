'use client'

/**
 * Re-export PhoneAuth from NextAuth implementation
 *
 * This file provides backward compatibility for all existing imports
 * from '@/components/auth/PhoneAuth' while using NextAuth.js internally.
 *
 * Uses NextAuth.js with Twilio SMS.
 */

export { PhoneAuth, PhoneAuthNextAuth } from './PhoneAuthNextAuth'
export type { PhoneAuthProps } from './PhoneAuthNextAuth'
