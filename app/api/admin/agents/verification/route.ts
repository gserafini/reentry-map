import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { getAISystemStatus } from '@/lib/api/settings'
import { sql } from '@/lib/db/client'
import { VerificationAgent } from '@/lib/ai-agents/verification-agent'
import type { ResourceSuggestion } from '@/lib/ai-agents/verification-agent'

/**
 * POST /api/admin/agents/verification
 *
 * Trigger the Verification Agent to process pending suggestions.
 * Requires admin authentication AND ai_verification_enabled in app_settings.
 * Accepts optional { batchSize: number } (default 10, max 50).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Check AI system settings
    const aiStatus = await getAISystemStatus()
    if (!aiStatus.isVerificationActive) {
      return NextResponse.json(
        {
          error: 'Verification agent is disabled',
          detail: !aiStatus.masterEnabled
            ? 'AI master switch is off. Enable it in /admin/settings.'
            : 'Verification agent is disabled in /admin/settings.',
        },
        { status: 403 }
      )
    }

    // Parse batch size from request body
    let batchSize = 10
    try {
      const body = (await request.json()) as { batchSize?: number }
      batchSize = Math.min(Math.max(body.batchSize || 10, 1), 50)
    } catch {
      // No body or invalid JSON — use default
    }

    // Fetch pending suggestions
    const pendingSuggestions = await sql<ResourceSuggestion[]>`
      SELECT * FROM resource_suggestions
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ${batchSize}
    `

    if (!pendingSuggestions || pendingSuggestions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending suggestions to verify',
        processed: 0,
        approved: 0,
        flagged: 0,
        rejected: 0,
      })
    }

    const agent = new VerificationAgent()
    const results = {
      processed: 0,
      approved: 0,
      flagged: 0,
      rejected: 0,
      errors: 0,
      totalCostUsd: 0,
    }

    for (const suggestion of pendingSuggestions) {
      try {
        const result = await agent.verify(suggestion, 'initial')

        // Log the verification
        await agent.logVerification(suggestion.id, null, 'initial', result)

        // Act on the decision
        if (result.decision === 'auto_approve') {
          const resourceId = await agent.autoApprove(suggestion)
          await agent.updateResourceWithVerificationResults(resourceId, suggestion, result)
          results.approved++
        } else if (result.decision === 'auto_reject') {
          await agent.autoReject(suggestion, result.decision_reason)
          results.rejected++
        } else {
          await agent.flagForHuman(suggestion, result.decision_reason)
          results.flagged++
        }

        results.processed++
        results.totalCostUsd += result.estimated_cost_usd
      } catch (error) {
        console.error(`Verification error for ${suggestion.name}:`, error)
        results.errors++
        results.processed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Verified ${results.processed} suggestions: ${results.approved} approved, ${results.flagged} flagged, ${results.rejected} rejected`,
      ...results,
    })
  } catch (error) {
    console.error('Verification agent error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run verification agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
