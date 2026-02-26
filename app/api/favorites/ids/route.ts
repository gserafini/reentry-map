/**
 * Favorites IDs API Route
 *
 * GET /api/favorites/ids - Get just the resource IDs the user has favorited
 * Lightweight endpoint for batch-checking favorite status without N+1 queries
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { sql as sqlClient } from '@/lib/db/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ ids: [] })
    }

    const result = await sqlClient<{ resource_id: string }[]>`
      SELECT resource_id FROM user_favorites
      WHERE user_id = ${session.user.id}
    `

    const ids = result.map((row) => row.resource_id)

    return NextResponse.json({ ids })
  } catch (error) {
    console.error('Error in GET /api/favorites/ids:', error)
    return NextResponse.json({ ids: [] })
  }
}
