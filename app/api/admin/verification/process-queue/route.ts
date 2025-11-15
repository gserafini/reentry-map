import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyResource } from '@/lib/utils/verification'

/**
 * POST /api/admin/verification/process-queue
 *
 * Processes all pending suggestions through the verification agent
 * - Fetches pending suggestions in batches
 * - Runs verification checks on each
 * - Auto-approves, flags, or rejects based on confidence
 * - Tracks API costs in ai_usage_tracking
 *
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get batch size from request (default 1 for testing, max 50)
    const body = (await request.json()) as { batchSize?: number }
    const batchSize = Math.min(body.batchSize || 1, 50)

    // Fetch pending suggestions
    const { data: pendingSuggestions, error: fetchError } = await supabase
      .from('resource_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (fetchError) {
      console.error('Error fetching pending suggestions:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch pending suggestions' }, { status: 500 })
    }

    if (!pendingSuggestions || pendingSuggestions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending suggestions to process',
        processed: 0,
        approved: 0,
        flagged: 0,
        rejected: 0,
      })
    }

    // Process each suggestion through verification
    const results = {
      processed: 0,
      approved: 0,
      flagged: 0,
      rejected: 0,
      errors: 0,
      totalCost: 0,
    }

    for (const suggestion of pendingSuggestions) {
      try {
        // Emit "started" event
        await supabase.from('verification_events').insert({
          suggestion_id: suggestion.id,
          event_type: 'started',
          event_data: {
            name: suggestion.name,
            address: suggestion.address,
            phone: suggestion.phone,
            website: suggestion.website,
          },
        })

        // Run verification checks
        const verificationResult = await verifyResource({
          name: suggestion.name,
          address: suggestion.address,
          city: suggestion.city,
          state: suggestion.state,
          zip: suggestion.zip,
          phone: suggestion.phone,
          website: suggestion.website,
          description: suggestion.description,
        })

        results.processed++
        results.totalCost += verificationResult.estimatedCost

        // Emit progress events for each check
        if (verificationResult.checks.url_reachable) {
          await supabase.from('verification_events').insert({
            suggestion_id: suggestion.id,
            event_type: 'progress',
            event_data: {
              step: 'URL Check',
              status: verificationResult.checks.url_reachable.pass ? 'passed' : 'failed',
              details: verificationResult.checks.url_reachable.pass
                ? `Website is reachable (${verificationResult.checks.url_reachable.status_code || 'OK'})`
                : 'Website is not reachable',
            },
          })
        }

        if (verificationResult.checks.phone_valid) {
          await supabase.from('verification_events').insert({
            suggestion_id: suggestion.id,
            event_type: 'progress',
            event_data: {
              step: 'Phone Validation',
              status: verificationResult.checks.phone_valid.pass ? 'passed' : 'failed',
              details: verificationResult.checks.phone_valid.pass
                ? `Phone number format is valid (${verificationResult.checks.phone_valid.format})`
                : `Invalid phone format: ${verificationResult.checks.phone_valid.format}`,
            },
          })
        }

        if (verificationResult.checks.address_geocodable) {
          await supabase.from('verification_events').insert({
            suggestion_id: suggestion.id,
            event_type: 'progress',
            event_data: {
              step: 'Address Geocoding',
              status: verificationResult.checks.address_geocodable.pass ? 'passed' : 'failed',
              details: verificationResult.checks.address_geocodable.pass
                ? `Address successfully geocoded (confidence: ${((verificationResult.checks.address_geocodable.confidence || 0) * 100).toFixed(0)}%)`
                : 'Address could not be geocoded',
            },
          })
        }

        // Emit cost event
        await supabase.from('verification_events').insert({
          suggestion_id: suggestion.id,
          event_type: 'cost',
          event_data: {
            operation: 'Verification Checks',
            total_cost_usd: verificationResult.estimatedCost,
          },
        })

        // Track API usage
        await supabase.from('ai_usage_tracking').insert({
          operation_type: 'verification',
          model_used: 'gpt-4o-mini',
          input_tokens: verificationResult.tokensUsed?.input || 0,
          output_tokens: verificationResult.tokensUsed?.output || 0,
          estimated_cost_usd: verificationResult.estimatedCost,
          user_id: user.id,
          metadata: {
            suggestion_id: suggestion.id,
            verification_score: verificationResult.overallScore,
            decision: verificationResult.decision,
          },
        })

        // Emit completed event with decision and reasoning
        await supabase.from('verification_events').insert({
          suggestion_id: suggestion.id,
          event_type: 'completed',
          event_data: {
            decision: verificationResult.decision,
            overall_score: verificationResult.overallScore,
            reasoning:
              verificationResult.decision === 'auto_approve'
                ? `High confidence (${(verificationResult.overallScore * 100).toFixed(0)}%) - all checks passed`
                : verificationResult.decision === 'auto_reject'
                  ? `Low confidence or failed critical checks: ${verificationResult.flagReason}`
                  : `Medium confidence: ${verificationResult.flagReason}`,
            checks_summary: {
              url_check: verificationResult.checks.url_reachable?.pass,
              phone_check: verificationResult.checks.phone_valid?.pass,
              address_check: verificationResult.checks.address_geocodable?.pass,
            },
          },
        })

        // Make decision based on verification result
        if (verificationResult.decision === 'auto_approve') {
          // Extract coordinates from verification result (geocoding check)
          const coords = verificationResult.checks.address_geocodable?.coords
          const latitude = coords?.lat || suggestion.latitude
          const longitude = coords?.lng || suggestion.longitude

          // Create resource and mark suggestion as approved
          const { data: newResource, error: createError } = await supabase
            .from('resources')
            .insert({
              name: suggestion.name,
              description: suggestion.description,
              address: suggestion.address,
              city: suggestion.city,
              state: suggestion.state,
              zip: suggestion.zip,
              latitude,
              longitude,
              phone: suggestion.phone,
              email: suggestion.email,
              website: suggestion.website,
              hours: suggestion.hours,
              primary_category: suggestion.primary_category,
              categories: suggestion.categories,
              tags: suggestion.tags,
              services_offered: suggestion.services_offered,
              eligibility_requirements: suggestion.eligibility_requirements,
              required_documents: suggestion.required_documents,
              fees: suggestion.fees,
              languages: suggestion.languages,
              accessibility_features: suggestion.accessibility_features,
              status: 'active',
              verification_status: 'verified',
              verification_confidence: verificationResult.overallScore,
              last_verified_at: new Date().toISOString(),
              ai_enriched: true,
              provenance: {
                discovered_by: 'verification_agent',
                discovered_at: new Date().toISOString(),
                discovery_method: 'auto_verification',
                verification_score: verificationResult.overallScore,
                verification_checks: verificationResult.checks,
              },
            })
            .select()
            .single()

          if (!createError && newResource) {
            // Update suggestion status
            await supabase
              .from('resource_suggestions')
              .update({
                status: 'approved',
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                created_resource_id: newResource.id,
                review_notes: `Auto-approved by verification agent (score: ${verificationResult.overallScore.toFixed(2)})`,
              })
              .eq('id', suggestion.id)

            results.approved++
          } else {
            console.error('Error creating resource:', createError)
            results.errors++
          }
        } else if (verificationResult.decision === 'flag_for_human') {
          // Keep as pending but add verification notes
          await supabase
            .from('resource_suggestions')
            .update({
              admin_notes: `Flagged by verification agent: ${verificationResult.flagReason}. Score: ${verificationResult.overallScore.toFixed(2)}`,
            })
            .eq('id', suggestion.id)

          results.flagged++
        } else if (verificationResult.decision === 'auto_reject') {
          // Reject the suggestion
          await supabase
            .from('resource_suggestions')
            .update({
              status: 'rejected',
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
              rejection_reason: `Auto-rejected by verification agent: ${verificationResult.flagReason}. Score: ${verificationResult.overallScore.toFixed(2)}`,
            })
            .eq('id', suggestion.id)

          results.rejected++
        }
      } catch (error) {
        console.error(`Error processing suggestion ${suggestion.id}:`, error)
        results.errors++

        // Emit failed event
        await supabase.from('verification_events').insert({
          suggestion_id: suggestion.id,
          event_type: 'failed',
          event_data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} suggestions: ${results.approved} approved, ${results.flagged} flagged, ${results.rejected} rejected`,
      ...results,
    })
  } catch (error) {
    console.error('Error processing verification queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
