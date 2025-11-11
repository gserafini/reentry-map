import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { VerificationAgent } from '@/lib/ai-agents/verification-agent'
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
    // Use service role client to bypass RLS for public API
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )

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

    // Initialize Verification Agent
    const verificationAgent = new VerificationAgent()

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
        const { data: existingResource } = await supabase
          .from('resources')
          .select('id, name, address')
          .ilike('name', r.name)
          .ilike('address', r.address)
          .eq('city', r.city)
          .eq('state', r.state)
          .limit(1)
          .single()

        if (existingResource) {
          results.skipped_duplicates++
          continue
        }

        // Check for existing pending suggestion
        const { data: existingSuggestion } = await supabase
          .from('resource_suggestions')
          .select('id, name, address')
          .ilike('name', r.name)
          .ilike('address', r.address)
          .eq('status', 'pending')
          .limit(1)
          .single()

        if (existingSuggestion) {
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
        const { data: suggestion, error } = await supabase
          .from('resource_suggestions')
          .insert({
            // Auth
            suggested_by: null,

            // Basic info
            name: r.name,
            address: r.address,
            city: r.city,
            state: r.state,
            zip: r.zip || r.zip_code || null,
            phone: r.phone || null,
            website: r.website || null,
            email: r.email || null,
            description: r.description || null,

            // Location
            latitude: r.latitude || null,
            longitude: r.longitude || null,

            // Categorization
            primary_category: r.primary_category || 'general_support',
            category: r.primary_category || r.category || 'general_support',
            categories: r.categories || null,
            tags: r.tags || null,

            // Services & Requirements
            hours: r.hours || null,
            services_offered: r.services || r.services_offered || null,
            eligibility_requirements: r.eligibility_criteria || r.eligibility_requirements || null,
            required_documents: r.required_documents || null,
            fees: r.fees || null,
            languages: r.languages || null,
            accessibility_features: r.accessibility || r.accessibility_features || null,

            // Organization metadata (for multi-location orgs)
            org_name: r.org_name || null,
            location_name: r.location_name || null,

            // Provenance (CRITICAL for data quality tracking)
            source: r.source || null,
            source_url: r.source_url || null,
            discovered_via: r.discovered_via || null,
            discovery_notes: r.discovery_notes || null,
            reason: `Submitted by ${submitter}${notes ? `: ${notes}` : ''}`,

            // Status
            status: 'pending',
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating suggestion:', error)
          results.errors++
          results.error_details.push(`${r.name}: ${error.message || JSON.stringify(error)}`)
          results.verification_results.push({
            name: r.name,
            status: 'error',
            error: error.message || JSON.stringify(error),
          })
          continue
        }

        results.submitted++

        // ====================================================================
        // AUTONOMOUS VERIFICATION
        // ====================================================================

        try {
          // Run verification
          const verificationResult = await verificationAgent.verify(
            suggestion as ResourceSuggestion,
            'initial'
          )

          // Log verification to database
          await verificationAgent.logVerification(
            suggestion.id,
            null, // No resource_id yet
            'initial',
            verificationResult
          )

          // Process verification decision
          if (verificationResult.decision === 'auto_approve') {
            // Auto-approve: Create resource immediately
            const resourceId = await verificationAgent.autoApprove(suggestion as ResourceSuggestion)
            results.auto_approved++

            results.verification_results.push({
              name: r.name,
              status: 'auto_approved',
              resource_id: resourceId,
              suggestion_id: suggestion.id,
              verification_score: verificationResult.overall_score,
              decision_reason: verificationResult.decision_reason,
            })
          } else if (verificationResult.decision === 'flag_for_human') {
            // Flag for human: Keep as pending with admin notes
            await verificationAgent.flagForHuman(
              suggestion as ResourceSuggestion,
              verificationResult.decision_reason
            )
            results.flagged_for_human++

            results.verification_results.push({
              name: r.name,
              status: 'flagged',
              suggestion_id: suggestion.id,
              verification_score: verificationResult.overall_score,
              decision_reason: verificationResult.decision_reason,
            })
          } else {
            // Auto-reject: Mark as rejected
            await verificationAgent.autoReject(
              suggestion as ResourceSuggestion,
              verificationResult.decision_reason
            )
            results.auto_rejected++

            results.verification_results.push({
              name: r.name,
              status: 'rejected',
              suggestion_id: suggestion.id,
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
            suggestion_id: suggestion.id,
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
      message: `Processed ${results.submitted} resources: ${results.auto_approved} auto-approved, ${results.flagged_for_human} flagged for review, ${results.auto_rejected} rejected`,
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
      next_steps:
        results.auto_approved > 0
          ? `${results.auto_approved} resources auto-approved and published. ${results.flagged_for_human} resources flagged for human review in admin panel.`
          : 'All resources flagged for human review in admin panel.',
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
