/**
 * Profile API Routes
 *
 * GET /api/profile - Fetch the authenticated user's profile.
 * PATCH /api/profile - Update the authenticated user's full name.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { sql } from '@/lib/db/client'
import { MAX_PROFILE_NAME_LENGTH, type Profile } from '@/lib/types/profile'

/**
 * GET /api/profile
 * Fetch the authenticated user's profile from the canonical users columns.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await sql<Profile[]>`
      SELECT id, email, name, phone, avatar_url, is_admin, created_at, updated_at
      FROM users WHERE id = ${session.user.id} LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ data: rows[0] })
  } catch (error) {
    console.error('Error in GET /api/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/profile
 * Update the authenticated user's full name.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const fields = body as Record<string, unknown>
    let name: string
    if (Object.prototype.hasOwnProperty.call(fields, 'name')) {
      if (typeof fields.name !== 'string') {
        return NextResponse.json({ error: 'Name must be a string' }, { status: 400 })
      }
      name = fields.name.trim()
    } else if (
      Object.prototype.hasOwnProperty.call(fields, 'first_name') &&
      Object.prototype.hasOwnProperty.call(fields, 'last_name') &&
      typeof fields.first_name === 'string' &&
      typeof fields.last_name === 'string'
    ) {
      // Compatibility for clients with a cached older profile form. Preserve
      // both submitted parts verbatim; do not infer or split canonical names.
      name = [fields.first_name.trim(), fields.last_name.trim()].filter(Boolean).join(' ')
    } else {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (name.length > MAX_PROFILE_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Name must be ${MAX_PROFILE_NAME_LENGTH} characters or fewer` },
        { status: 400 }
      )
    }

    const updatedRows = await sql<Profile[]>`
      UPDATE users
      SET name = ${name || null},
          updated_at = NOW()
      WHERE id = ${session.user.id}
      RETURNING id, email, name, phone, avatar_url, is_admin, created_at, updated_at
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
