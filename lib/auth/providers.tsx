'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import type { ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
  session?: Session | null
}

/**
 * NextAuth.js Session Provider
 *
 * Wraps the application to provide session context for client components.
 * This enables useSession() hook throughout the app.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { AuthProvider } from '@/lib/auth/providers'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AuthProvider>
 *           {children}
 *         </AuthProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider
      session={session}
      // Refetch session every 5 minutes
      refetchInterval={5 * 60}
      // Refetch when window regains focus
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  )
}

export default AuthProvider
