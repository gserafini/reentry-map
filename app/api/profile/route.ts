/**
 * Profile API Routes
 *
 * GET /api/profile - Fetch authenticated user's profile (creates on first access)
 * PATCH /api/profile - Update profile (first_name, last_name)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { sql } from '@/lib/db/client'

interface UserProfile {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
  is_admin: boolean | null
  created_at: string | null
  updated_at: string | null
}

/**
 * GET /api/profile
 * Fetch the authenticated user's profile from the users table.
 * Creates a new profile row on first access (upsert with ON CONFLICT).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await sql<UserProfile[]>`
      SELECT * FROM users WHERE id = ${session.user.id} LIMIT 1
    `

    if (rows.length === 0) {
      // Create profile on first access
      const newRows = await sql<UserProfile[]>`
        INSERT INTO users (id, phone)
        VALUES (${session.user.id}, ${session.user.phone || null})
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `

      // ON CONFLICT DO NOTHING won't return rows if conflict, so re-fetch
      if (newRows.length === 0) {
        const refetchRows = await sql<UserProfile[]>`
          SELECT * FROM users WHERE id = ${session.user.id} LIMIT 1
        `
        return NextResponse.json({ data: refetchRows[0] || null })
      }

      return NextResponse.json({ data: newRows[0] })
    }

    return NextResponse.json({ data: rows[0] })
  } catch (error) {
    console.error('Error in GET /api/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/profile
 * Update the authenticated user's first_name and last_name.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { first_name?: string; last_name?: string }

    const updatedRows = await sql<UserProfile[]>`
      UPDATE users
      SET first_name = ${body.first_name?.trim() || null},
          last_name = ${body.last_name?.trim() || null},
          updated_at = NOW()
      WHERE id = ${session.user.id}
      RETURNING *
    `

    if (updatedRows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ data: updatedRows[0] })
  } catch (error) {
    console.error('Error in PATCH /api/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
