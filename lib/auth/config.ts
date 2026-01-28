/**
 * NextAuth.js v4 Configuration
 *
 * Replaces Supabase Auth with:
 * - Phone OTP via Twilio (custom credentials provider)
 * - Email/Password (credentials provider)
 * - JWT session strategy
 *
 * @see https://next-auth.js.org/configuration/options
 */

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

// Database connection pool (lazy initialization for build compatibility)
let pool: Pool | null = null
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://reentrymap:password@localhost:6432/reentry_map',
    })
  }
  return pool
}

// User type from our database
export interface DbUser {
  id: string
  email: string | null
  phone: string | null
  name: string | null
  avatar_url: string | null
  is_admin: boolean
  password_hash: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Normalize phone to E.164 format (+1XXXXXXXXXX)
 */
export function normalizePhone(phone: string): string {
  // Strip all non-numeric characters
  const digits = phone.replace(/\D/g, '')

  // If already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  // Add US country code
  if (digits.length === 10) {
    return `+1${digits}`
  }

  // Already includes + sign
  if (phone.startsWith('+')) {
    return phone
  }

  return `+${digits}`
}

/**
 * Find user by email
 */
export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await getPool().query<DbUser>(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email.toLowerCase()]
  )
  return rows[0] || null
}

/**
 * Find user by phone
 */
export async function getUserByPhone(phone: string): Promise<DbUser | null> {
  const normalizedPhone = normalizePhone(phone)
  const { rows } = await getPool().query<DbUser>(
    'SELECT * FROM users WHERE phone = $1 LIMIT 1',
    [normalizedPhone]
  )
  return rows[0] || null
}

/**
 * Find user by ID
 */
export async function getUserById(id: string): Promise<DbUser | null> {
  const { rows } = await getPool().query<DbUser>(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [id]
  )
  return rows[0] || null
}

/**
 * Create new user (phone or email)
 */
export async function createUser(data: {
  email?: string
  phone?: string
  name?: string
  password?: string
}): Promise<DbUser> {
  const passwordHash = data.password
    ? await bcrypt.hash(data.password, 12)
    : null

  const { rows } = await getPool().query<DbUser>(
    `INSERT INTO users (id, email, phone, name, password_hash, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [
      data.email?.toLowerCase() || null,
      data.phone ? normalizePhone(data.phone) : null,
      data.name || null,
      passwordHash,
    ]
  )
  return rows[0]
}

/**
 * Verify OTP code from phone_otps table
 */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone)

  const { rows } = await getPool().query(
    `SELECT id FROM phone_otps
     WHERE phone = $1
       AND code = $2
       AND expires_at > NOW()
       AND verified = false
     LIMIT 1`,
    [normalizedPhone, code]
  )

  if (rows.length === 0) {
    return false
  }

  // Mark OTP as verified
  await getPool().query('UPDATE phone_otps SET verified = true WHERE id = $1', [
    rows[0].id,
  ])

  return true
}

/**
 * NextAuth.js v4 configuration
 */
export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password provider
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await getUserByEmail(email)
        if (!user || !user.password_hash) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.password_hash)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar_url,
        }
      },
    }),

    // Phone OTP provider (custom)
    CredentialsProvider({
      id: 'phone-otp',
      name: 'Phone',
      credentials: {
        phone: { label: 'Phone', type: 'tel' },
        code: { label: 'Verification Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) {
          return null
        }

        const phone = credentials.phone as string
        const code = credentials.code as string

        // Verify OTP
        const isValid = await verifyOtp(phone, code)
        if (!isValid) {
          return null
        }

        // Find or create user
        let user = await getUserByPhone(phone)
        if (!user) {
          user = await createUser({ phone })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar_url,
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
    newUser: '/profile', // Redirect new users to profile page
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }

      // Fetch latest user data (including admin status) from database
      if (token.id) {
        const dbUser = await getUserById(token.id as string)
        if (dbUser) {
          token.isAdmin = dbUser.is_admin
          token.phone = dbUser.phone
          token.name = dbUser.name
          token.picture = dbUser.avatar_url
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
        session.user.phone = token.phone as string | null
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      // Allow same origin
      if (new URL(url).origin === baseUrl) {
        return url
      }
      return baseUrl
    },
  },

  events: {
    async signIn({ user, isNewUser }) {
      // Log sign-in for analytics
      console.log(`User ${user.id} signed in. New user: ${isNewUser}`)
    },
    async signOut({ token }) {
      // Log sign-out
      console.log(`User ${token?.sub} signed out`)
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
}

export default authOptions
