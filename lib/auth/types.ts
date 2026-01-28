/**
 * NextAuth.js Type Extensions
 *
 * Extends the default NextAuth types to include our custom user properties
 */

import type { DefaultSession, DefaultUser } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  /**
   * Extended user object returned from providers
   */
  interface User extends DefaultUser {
    isAdmin?: boolean
    phone?: string | null
  }

  /**
   * Extended session object available in getSession(), useSession(), etc.
   */
  interface Session extends DefaultSession {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      isAdmin?: boolean
      phone?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT token
   */
  interface JWT extends DefaultJWT {
    id?: string
    isAdmin?: boolean
    phone?: string | null
  }
}
