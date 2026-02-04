/**
 * Review Helpfulness API Routes
 *
 * GET /api/reviews/helpfulness?reviewIds=id1,id2,id3 - Get user's helpfulness votes
 * POST /api/reviews/helpfulness - Vote on review helpfulness
 * DELETE /api/reviews/helpfulness - Remove helpfulness vote
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import {
  voteReviewHelpfulness,
  removeHelpfulnessVote,
  getUserHelpfulnessVotes,
} from '@/lib/api/reviews'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ data: [] })
    }

    const { searchParams } = new URL(request.url)
    const reviewIdsParam = searchParams.get('reviewIds')

    if (!reviewIdsParam) {
      return NextResponse.json({ error: 'reviewIds is required' }, { status: 400 })
    }

    const reviewIds = reviewIdsParam.split(',').filter(Boolean)

    if (reviewIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const { data, error } = await getUserHelpfulnessVotes(session.user.id, reviewIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/reviews/helpfulness:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { reviewId?: string; isHelpful?: boolean }
    const { reviewId, isHelpful } = body

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 })
    }

    if (typeof isHelpful !== 'boolean') {
      return NextResponse.json({ error: 'isHelpful must be a boolean' }, { status: 400 })
    }

    const { data, error } = await voteReviewHelpfulness(session.user.id, reviewId, isHelpful)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST /api/reviews/helpfulness:', error)
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

    const { error } = await removeHelpfulnessVote(session.user.id, reviewId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/reviews/helpfulness:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
