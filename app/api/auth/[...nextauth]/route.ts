/**
 * NextAuth.js API Route Handler
 *
 * Handles all authentication routes:
 * - POST /api/auth/signin
 * - POST /api/auth/signout
 * - GET /api/auth/session
 * - GET /api/auth/providers
 * - GET /api/auth/csrf
 *
 * @see https://next-auth.js.org/getting-started/rest-api
 */

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
