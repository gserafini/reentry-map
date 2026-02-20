/**
 * POST /api/auth/signup
 *
 * Creates a new user with email/password in self-hosted PostgreSQL
 * Used by SignUpForm for NextAuth-based registration
 */

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

// Database connection (lazy initialization)
let pool: Pool | null = null
function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required')
    }
    const isLocalhost =
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
    pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    })
  }
  return pool
}

interface SignupRequest {
  email: string
  password: string
  name?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupRequest
    const { email, password, name } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const { rows: existingUsers } = await getPool().query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    )

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const { rows } = await getPool().query(
      `INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       RETURNING id, email, name`,
      [normalizedEmail, name?.trim() || null, passwordHash]
    )

    const newUser = rows[0]

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
