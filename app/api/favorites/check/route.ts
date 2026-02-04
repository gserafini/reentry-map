/**
 * Check if resource is favorited
 *
 * GET /api/favorites/check?resourceId=xxx - Check if user has favorited a resource
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { isFavorited } from '@/lib/api/favorites'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ isFavorited: false })
    }

    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get('resourceId')

    if (!resourceId) {
      return NextResponse.json({ error: 'resourceId is required' }, { status: 400 })
    }

    const favorited = await isFavorited(session.user.id, resourceId)

    return NextResponse.json({ isFavorited: favorited })
  } catch (error) {
    console.error('Error in GET /api/favorites/check:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
