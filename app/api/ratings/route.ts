/**
 * Ratings API Routes
 *
 * GET /api/ratings?resourceId=xxx - Get user's rating for a resource
 * POST /api/ratings - Submit or update a rating
 * DELETE /api/ratings - Delete a rating
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserRating, submitRating, deleteRating, getRatingStats } from '@/lib/api/ratings'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get('resourceId')
    const statsOnly = searchParams.get('statsOnly') === 'true'

    if (!resourceId) {
      return NextResponse.json({ error: 'resourceId is required' }, { status: 400 })
    }

    // If just getting stats, no auth required
    if (statsOnly) {
      const { data, error } = await getRatingStats(resourceId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ stats: data })
    }

    // Getting user's rating requires auth
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ rating: null })
    }

    const rating = await getUserRating(session.user.id, resourceId)

    return NextResponse.json({ rating })
  } catch (error) {
    console.error('Error in GET /api/ratings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { resourceId?: string; rating?: number }
    const { resourceId, rating } = body

    if (!resourceId) {
      return NextResponse.json({ error: 'resourceId is required' }, { status: 400 })
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    const { data, error } = await submitRating(session.user.id, resourceId, rating)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST /api/ratings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { resourceId?: string }
    const { resourceId } = body

    if (!resourceId) {
      return NextResponse.json({ error: 'resourceId is required' }, { status: 400 })
    }

    const { error } = await deleteRating(session.user.id, resourceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/ratings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
