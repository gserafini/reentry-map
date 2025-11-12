import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'

/**
 * POST /api/admin/flagged-resources/[id]/reject
 * Reject a flagged resource suggestion or flag for further attention (admin only)
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via Supabase auth
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

    const supabase = auth.getClient()
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
    const { error: updateError } = await supabase
      .from('resource_suggestions')
      .update({
        status,
        rejection_reason: reason,
        closure_status: closure_status || null,
        correction_notes: notes || null,
        reviewed_by: auth.userId || null,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update suggestion:', updateError)
      return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 })
    }

    // Update verification log to mark as human reviewed
    await supabase
      .from('verification_logs')
      .update({
        human_reviewed: true,
        human_reviewer_id: auth.userId || null,
        human_decision: status,
      })
      .eq('suggestion_id', id)
      .order('created_at', { ascending: false })
      .limit(1)

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
