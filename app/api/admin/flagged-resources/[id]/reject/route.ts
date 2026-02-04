import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resourceSuggestions, verificationLogs } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

/**
 * POST /api/admin/flagged-resources/[id]/reject
 * Reject a flagged resource suggestion or flag for further attention (admin only)
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via NextAuth
 * - API key (Claude Code/scripts): Include header `x-admin-api-key: your-key`
 *
 * Body:
 * {
 *   reason: string, // Required structured rejection reason
 *   notes?: string, // Optional additional context
 *   closure_status?: 'temporary' | 'permanent' | null
 * }
 *
 * Rejection Reasons:
 * - Permanent rejections: duplicate, wrong_service_type, permanently_closed, does_not_exist, wrong_location, spam, insufficient_info
 * - Needs attention: wrong_name, incomplete_address, temporarily_closed, needs_verification, confidential_address, missing_details
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const { id } = await params
    const body = (await request.json()) as {
      reason: string
      notes?: string
      closure_status?: 'temporary' | 'permanent' | null
    }
    const { reason, notes, closure_status } = body

    if (!reason) {
      return NextResponse.json({ error: 'rejection reason is required' }, { status: 400 })
    }

    // Determine if this is a permanent rejection or needs attention
    const permanentReasons = [
      'duplicate',
      'wrong_service_type',
      'permanently_closed',
      'does_not_exist',
      'wrong_location',
      'spam',
      'insufficient_info',
    ]

    const needsAttentionReasons = [
      'wrong_name',
      'incomplete_address',
      'temporarily_closed',
      'needs_verification',
      'confidential_address',
      'missing_details',
    ]

    let status: 'rejected' | 'needs_attention'
    if (permanentReasons.includes(reason)) {
      status = 'rejected'
    } else if (needsAttentionReasons.includes(reason)) {
      status = 'needs_attention'
    } else {
      return NextResponse.json({ error: `Invalid rejection reason: ${reason}` }, { status: 400 })
    }

    // Build review notes
    const reviewNotes = [
      auth.authMethod === 'api_key'
        ? `${status === 'rejected' ? 'Rejected' : 'Flagged for attention'} via API key (Claude Code)`
        : `${status === 'rejected' ? 'Rejected' : 'Flagged for attention'} by admin`,
      `Reason: ${reason}`,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    // Update suggestion with structured rejection/attention flag
    await db
      .update(resourceSuggestions)
      .set({
        status,
        rejectionReason: reason,
        closureStatus: closure_status || null,
        correctionNotes: notes || null,
        reviewedBy: auth.userId || null,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(resourceSuggestions.id, id))

    // Update verification log to mark as human reviewed
    // First find the most recent log for this suggestion
    const [latestLog] = await db
      .select({ id: verificationLogs.id })
      .from(verificationLogs)
      .where(eq(verificationLogs.suggestionId, id))
      .orderBy(desc(verificationLogs.createdAt))
      .limit(1)

    if (latestLog) {
      await db
        .update(verificationLogs)
        .set({
          humanReviewed: true,
          humanReviewerId: auth.userId || null,
          humanDecision: status,
        })
        .where(eq(verificationLogs.id, latestLog.id))
    }

    return NextResponse.json({
      success: true,
      status,
      reason,
      message:
        status === 'rejected'
          ? 'Resource suggestion permanently rejected'
          : 'Resource flagged for further attention',
    })
  } catch (error) {
    console.error('Error rejecting resource:', error)
    return NextResponse.json({ error: 'Failed to reject resource' }, { status: 500 })
  }
}
