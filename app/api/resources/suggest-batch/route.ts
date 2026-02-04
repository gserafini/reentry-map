import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/client'
import { VerificationAgent } from '@/lib/ai-agents/verification-agent'
import { getAISystemStatus } from '@/lib/api/settings'
import type { ResourceSuggestion } from '@/lib/types/database'

/**
 * POST /api/resources/suggest-batch
 *
 * Public API for AI agents to submit multiple resource suggestions efficiently.
 * Now includes autonomous verification with auto-approval for high-quality submissions.
 *
 * Flow:
 * 1. Create resource_suggestion entry
 * 2. Run Verification Agent (Level 1-3 checks)
 * 3. Auto-approve (87%), flag for human (8%), or auto-reject (5%)
 * 4. Return detailed per-resource verification results
 *
 * Optimized for:
 * - Claude Code, Claude Web, and other AI agents
 * - Batch submissions (1-100 resources at once)
 * - Full provenance tracking
 * - Autonomous quality assurance
 * - Adversarial verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      resources: unknown[]
      submitter?: string
      notes?: string
    }

    const { resources, submitter = 'ai_agent', notes } = body

    if (!Array.isArray(resources) || resources.length === 0) {
      return NextResponse.json({ error: 'Resources must be a non-empty array' }, { status: 400 })
    }

    if (resources.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 resources per batch' }, { status: 400 })
    }

    const results = {
      submitted: 0,
      skipped_duplicates: 0,
      errors: 0,
      auto_approved: 0,
      flagged_for_human: 0,
      auto_rejected: 0,
      error_details: [] as string[],
      verification_results: [] as Array<{
        name: string
        status: 'submitted' | 'auto_approved' | 'flagged' | 'rejected' | 'duplicate' | 'error'
        resource_id?: string
        suggestion_id?: string
        verification_score?: number
        decision_reason?: string
        error?: string
      }>,
    }

    // Check AI system status
    const aiStatus = await getAISystemStatus()
    const verificationEnabled = aiStatus.isVerificationActive

    // Initialize Verification Agent (only if enabled)
    const verificationAgent = verificationEnabled ? new VerificationAgent() : null

    // Process each resource
    for (const resource of resources) {
      try {
        // Extract resource data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = resource as any

        // Validate required fields
        if (!r.name || !r.address || !r.city || !r.state) {
          console.error('Missing required fields:', { name: r.name, address: r.address })
          results.errors++
          continue
        }

        // Check for existing resource (avoid suggesting duplicates)
        const existingResource = await sql`
          SELECT id, name, address FROM resources
          WHERE LOWER(name) = LOWER(${r.name})
            AND LOWER(address) = LOWER(${r.address})
            AND city = ${r.city}
            AND state = ${r.state}
          LIMIT 1
        `

        if (existingResource.length > 0) {
          results.skipped_duplicates++
          continue
        }

        // Check for existing pending suggestion
        const existingSuggestion = await sql`
          SELECT id, name, address FROM resource_suggestions
          WHERE LOWER(name) = LOWER(${r.name})
            AND LOWER(address) = LOWER(${r.address})
            AND status = 'pending'
          LIMIT 1
        `

        if (existingSuggestion.length > 0) {
          results.skipped_duplicates++
          results.verification_results.push({
            name: r.name,
            status: 'duplicate',
            decision_reason: 'Already exists in pending suggestions',
          })
          continue
        }

        // Create suggestion with FULL resource data (expanded schema)
        // Set suggested_by to NULL for public API submissions (bypasses RLS auth requirement)
        let suggestion: Record<string, unknown>
        try {
          const reasonText = `Submitted by ${submitter}${notes ? `: ${notes}` : ''}`
          const insertResult = await sql`
            INSERT INTO resource_suggestions (
              suggested_by, name, address, city, state, zip, phone, website, email,
              description, latitude, longitude, primary_category, category,
              categories, tags, hours, services_offered, eligibility_requirements,
              languages, accessibility_features,
              discovered_via, discovery_notes, reason, status
            ) VALUES (
              ${null},
              ${r.name},
              ${r.address},
              ${r.city},
              ${r.state},
              ${r.zip || r.zip_code || null},
              ${r.phone || null},
              ${r.website || null},
              ${r.email || null},
              ${r.description || null},
              ${r.latitude || null},
              ${r.longitude || null},
              ${r.primary_category || 'general_support'},
              ${r.primary_category || r.category || 'general_support'},
              ${r.categories || null},
              ${r.tags || null},
              ${r.hours ? JSON.stringify(r.hours) : null}::jsonb,
              ${r.services || r.services_offered || null},
              ${r.eligibility_criteria || r.eligibility_requirements || null},
              ${r.languages || null},
              ${r.accessibility || r.accessibility_features || null},
              ${r.discovered_via || null},
              ${r.discovery_notes || null},
              ${reasonText},
              ${'pending'}
            )
            RETURNING *
          `

          if (insertResult.length === 0) {
            throw new Error('Insert returned no rows')
          }
          suggestion = insertResult[0] as Record<string, unknown>
        } catch (insertError) {
          const errorMessage =
            insertError instanceof Error ? insertError.message : JSON.stringify(insertError)
          console.error('Error creating suggestion:', insertError)
          results.errors++
          results.error_details.push(`${r.name}: ${errorMessage}`)
          results.verification_results.push({
            name: r.name,
            status: 'error',
            error: errorMessage,
          })
          continue
        }

        results.submitted++

        // ====================================================================
        // AUTONOMOUS VERIFICATION
        // ====================================================================

        const suggestionId = suggestion.id as string

        // Skip verification if AI systems are disabled
        if (!verificationEnabled || !verificationAgent) {
          results.flagged_for_human++
          results.verification_results.push({
            name: r.name,
            status: 'flagged',
            suggestion_id: suggestionId,
            decision_reason:
              'AI verification is currently disabled. All submissions require manual admin review. Enable AI systems in admin settings to activate autonomous verification.',
          })
          continue
        }

        try {
          // Run verification
          const verificationResult = await verificationAgent.verify(
            suggestion as unknown as ResourceSuggestion,
            'initial'
          )

          // Log verification to database
          await verificationAgent.logVerification(
            suggestionId,
            null, // No resource_id yet
            'initial',
            verificationResult
          )

          // Process verification decision
          if (verificationResult.decision === 'auto_approve') {
            // Auto-approve: Create resource immediately
            const resourceId = await verificationAgent.autoApprove(
              suggestion as unknown as ResourceSuggestion
            )
            results.auto_approved++

            results.verification_results.push({
              name: r.name,
              status: 'auto_approved',
              resource_id: resourceId,
              suggestion_id: suggestionId,
              verification_score: verificationResult.overall_score,
              decision_reason: verificationResult.decision_reason,
            })
          } else if (verificationResult.decision === 'flag_for_human') {
            // Flag for human: Keep as pending with admin notes
            await verificationAgent.flagForHuman(
              suggestion as unknown as ResourceSuggestion,
              verificationResult.decision_reason
            )
            results.flagged_for_human++

            results.verification_results.push({
              name: r.name,
              status: 'flagged',
              suggestion_id: suggestionId,
              verification_score: verificationResult.overall_score,
              decision_reason: verificationResult.decision_reason,
            })
          } else {
            // Auto-reject: Mark as rejected
            await verificationAgent.autoReject(
              suggestion as unknown as ResourceSuggestion,
              verificationResult.decision_reason
            )
            results.auto_rejected++

            results.verification_results.push({
              name: r.name,
              status: 'rejected',
              suggestion_id: suggestionId,
              verification_score: verificationResult.overall_score,
              decision_reason: verificationResult.decision_reason,
            })
          }
        } catch (verificationError) {
          // Verification failed - keep as pending for human review
          console.error('Verification failed:', verificationError)
          results.flagged_for_human++

          results.verification_results.push({
            name: r.name,
            status: 'flagged',
            suggestion_id: suggestionId,
            decision_reason: `Verification error: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`,
          })
        }
      } catch (error) {
        console.error('Error processing resource:', error)
        results.errors++
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resourceName = (resource as any)?.name || 'Unknown resource'
        results.error_details.push(
          `${resourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: verificationEnabled
        ? `Processed ${results.submitted} resources: ${results.auto_approved} auto-approved, ${results.flagged_for_human} flagged for review, ${results.auto_rejected} rejected`
        : `Processed ${results.submitted} resources: AI verification disabled, all flagged for manual review`,
      ai_systems: {
        verification_enabled: verificationEnabled,
        status: verificationEnabled
          ? 'Ready for autonomous verification'
          : 'AI systems currently disabled - all submissions require manual review',
      },
      stats: {
        total_received: resources.length,
        submitted: results.submitted,
        auto_approved: results.auto_approved,
        flagged_for_human: results.flagged_for_human,
        auto_rejected: results.auto_rejected,
        skipped_duplicates: results.skipped_duplicates,
        errors: results.errors,
      },
      error_details: results.errors > 0 ? results.error_details : undefined,
      verification_results: results.verification_results,
      next_steps: verificationEnabled
        ? results.auto_approved > 0
          ? `${results.auto_approved} resources auto-approved and published. ${results.flagged_for_human} resources flagged for human review in admin panel.`
          : 'All resources flagged for human review in admin panel.'
        : 'AI verification is currently disabled. All submissions are pending manual admin review. Enable AI systems in /admin/settings to activate autonomous verification.',
    })
  } catch (error) {
    console.error('Error in batch suggest:', error)
    return NextResponse.json(
      {
        error: 'Failed to submit suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
