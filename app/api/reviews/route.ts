/**
 * Reviews API Routes
 *
 * GET /api/reviews?resourceId=xxx - Get all reviews for a resource
 * GET /api/reviews?resourceId=xxx&userReview=true - Get user's review for a resource
 * POST /api/reviews - Submit a new review
 * PATCH /api/reviews - Update an existing review
 * DELETE /api/reviews - Delete a review
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import {
  getResourceReviews,
  getUserReview,
  submitReview,
  updateReview,
  deleteReview,
} from '@/lib/api/reviews'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get('resourceId')
    const userReview = searchParams.get('userReview') === 'true'

    if (!resourceId) {
      return NextResponse.json({ error: 'resourceId is required' }, { status: 400 })
    }

    // If getting user's specific review
    if (userReview) {
      const session = await getServerSession(authOptions)

      if (!session?.user?.id) {
        return NextResponse.json({ review: null })
      }

      const review = await getUserReview(session.user.id, resourceId)
      return NextResponse.json({ review })
    }

    // Get all reviews for the resource
    const { data, error } = await getResourceReviews(resourceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      resourceId?: string
      rating?: number
      text?: string | null
      pros?: string[] | null
      cons?: string[] | null
      tips?: string | null
    }
    const { resourceId, rating, text, pros, cons, tips } = body

    if (!resourceId) {
      return NextResponse.json({ error: 'resourceId is required' }, { status: 400 })
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    const { data, error } = await submitReview({
      user_id: session.user.id,
      resource_id: resourceId,
      rating,
      text,
      pros,
      cons,
      tips,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST /api/reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      reviewId?: string
      rating?: number
      text?: string | null
      pros?: string[] | null
      cons?: string[] | null
      tips?: string | null
    }
    const { reviewId, rating, text, pros, cons, tips } = body

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 })
    }

    const { data, error } = await updateReview(reviewId, session.user.id, {
      rating,
      text,
      pros,
      cons,
      tips,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { reviewId?: string }
    const { reviewId } = body

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 })
    }

    const { error } = await deleteReview(reviewId, session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
