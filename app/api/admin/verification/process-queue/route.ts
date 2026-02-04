import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'
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
    // Check authentication (session or API key)
    const auth = await checkAdminAuth(request)
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.authMethod === 'none' ? 401 : 403 }
      )
    }

    // Get batch size from request (default 1 for testing, max 50)
    const body = (await request.json()) as { batchSize?: number }
    const batchSize = Math.min(body.batchSize || 1, 50)

    // Fetch pending suggestions
    const pendingSuggestions = await sql`
      SELECT * FROM resource_suggestions
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ${batchSize}
    `

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
        await sql`
          INSERT INTO verification_events (suggestion_id, event_type, event_data)
          VALUES (
            ${suggestion.id},
            ${'started'},
            ${JSON.stringify({
              name: suggestion.name,
              address: suggestion.address,
              phone: suggestion.phone,
              website: suggestion.website,
            })}::jsonb
          )
        `

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
          await sql`
            INSERT INTO verification_events (suggestion_id, event_type, event_data)
            VALUES (
              ${suggestion.id},
              ${'progress'},
              ${JSON.stringify({
                step: 'URL Check',
                status: verificationResult.checks.url_reachable.pass ? 'passed' : 'failed',
                details: verificationResult.checks.url_reachable.pass
                  ? `Website is reachable (${verificationResult.checks.url_reachable.status_code || 'OK'})`
                  : 'Website is not reachable',
              })}::jsonb
            )
          `
        }

        if (verificationResult.checks.phone_valid) {
          await sql`
            INSERT INTO verification_events (suggestion_id, event_type, event_data)
            VALUES (
              ${suggestion.id},
              ${'progress'},
              ${JSON.stringify({
                step: 'Phone Validation',
                status: verificationResult.checks.phone_valid.pass ? 'passed' : 'failed',
                details: verificationResult.checks.phone_valid.pass
                  ? `Phone number format is valid (${verificationResult.checks.phone_valid.format})`
                  : `Invalid phone format: ${verificationResult.checks.phone_valid.format}`,
              })}::jsonb
            )
          `
        }

        if (verificationResult.checks.address_geocodable) {
          await sql`
            INSERT INTO verification_events (suggestion_id, event_type, event_data)
            VALUES (
              ${suggestion.id},
              ${'progress'},
              ${JSON.stringify({
                step: 'Address Geocoding',
                status: verificationResult.checks.address_geocodable.pass ? 'passed' : 'failed',
                details: verificationResult.checks.address_geocodable.pass
                  ? `Address successfully geocoded (confidence: ${((verificationResult.checks.address_geocodable.confidence || 0) * 100).toFixed(0)}%)`
                  : 'Address could not be geocoded',
              })}::jsonb
            )
          `
        }

        // Emit cost event
        await sql`
          INSERT INTO verification_events (suggestion_id, event_type, event_data)
          VALUES (
            ${suggestion.id},
            ${'cost'},
            ${JSON.stringify({
              operation: 'Verification Checks',
              total_cost_usd: verificationResult.estimatedCost,
            })}::jsonb
          )
        `

        // Track API usage
        await sql`
          INSERT INTO ai_usage_tracking (
            operation_type, model_used, input_tokens, output_tokens,
            estimated_cost_usd, user_id, metadata
          )
          VALUES (
            ${'verification'},
            ${'gpt-4o-mini'},
            ${verificationResult.tokensUsed?.input || 0},
            ${verificationResult.tokensUsed?.output || 0},
            ${verificationResult.estimatedCost},
            ${auth.userId || null},
            ${JSON.stringify({
              suggestion_id: suggestion.id,
              verification_score: verificationResult.overallScore,
              decision: verificationResult.decision,
            })}::jsonb
          )
        `

        // Emit completed event with decision and reasoning
        await sql`
          INSERT INTO verification_events (suggestion_id, event_type, event_data)
          VALUES (
            ${suggestion.id},
            ${'completed'},
            ${JSON.stringify({
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
            })}::jsonb
          )
        `

        // Make decision based on verification result
        if (verificationResult.decision === 'auto_approve') {
          // Extract coordinates from verification result (geocoding check)
          const coords = verificationResult.checks.address_geocodable?.coords
          const latitude = coords?.lat || suggestion.latitude
          const longitude = coords?.lng || suggestion.longitude

          // Create resource and mark suggestion as approved
          const [newResource] = await sql`
            INSERT INTO resources (
              name, description, address, city, state, zip,
              latitude, longitude, phone, email, website, hours,
              primary_category, categories, tags,
              services_offered, eligibility_requirements, required_documents,
              fees, languages, accessibility_features,
              status, verification_status, verification_confidence,
              last_verified_at, ai_enriched, provenance
            )
            VALUES (
              ${suggestion.name}, ${suggestion.description}, ${suggestion.address},
              ${suggestion.city}, ${suggestion.state}, ${suggestion.zip},
              ${latitude}, ${longitude},
              ${suggestion.phone}, ${suggestion.email}, ${suggestion.website},
              ${suggestion.hours ? JSON.stringify(suggestion.hours) : null}::jsonb,
              ${suggestion.primary_category},
              ${suggestion.categories || null},
              ${suggestion.tags || null},
              ${suggestion.services_offered || null},
              ${suggestion.eligibility_requirements || null},
              ${suggestion.required_documents || null},
              ${suggestion.fees || null},
              ${suggestion.languages || null},
              ${suggestion.accessibility_features || null},
              ${'active'}, ${'verified'}, ${verificationResult.overallScore},
              ${new Date().toISOString()}, ${true},
              ${JSON.stringify({
                discovered_by: 'verification_agent',
                discovered_at: new Date().toISOString(),
                discovery_method: 'auto_verification',
                verification_score: verificationResult.overallScore,
                verification_checks: verificationResult.checks,
              })}::jsonb
            )
            RETURNING *
          `

          if (newResource) {
            // Update suggestion status
            await sql`
              UPDATE resource_suggestions
              SET status = ${'approved'},
                  reviewed_by = ${auth.userId || null},
                  reviewed_at = NOW(),
                  created_resource_id = ${newResource.id},
                  review_notes = ${`Auto-approved by verification agent (score: ${verificationResult.overallScore.toFixed(2)})`}
              WHERE id = ${suggestion.id}
            `

            results.approved++
          } else {
            console.error('Error creating resource: no row returned')
            results.errors++
          }
        } else if (verificationResult.decision === 'flag_for_human') {
          // Keep as pending but add verification notes
          await sql`
            UPDATE resource_suggestions
            SET admin_notes = ${`Flagged by verification agent: ${verificationResult.flagReason}. Score: ${verificationResult.overallScore.toFixed(2)}`}
            WHERE id = ${suggestion.id}
          `

          results.flagged++
        } else if (verificationResult.decision === 'auto_reject') {
          // Reject the suggestion
          await sql`
            UPDATE resource_suggestions
            SET status = ${'rejected'},
                reviewed_by = ${auth.userId || null},
                reviewed_at = NOW(),
                rejection_reason = ${`Auto-rejected by verification agent: ${verificationResult.flagReason}. Score: ${verificationResult.overallScore.toFixed(2)}`}
            WHERE id = ${suggestion.id}
          `

          results.rejected++
        }
      } catch (error) {
        console.error(`Error processing suggestion ${suggestion.id}:`, error)
        results.errors++

        // Emit failed event
        await sql`
          INSERT INTO verification_events (suggestion_id, event_type, event_data)
          VALUES (
            ${suggestion.id},
            ${'failed'},
            ${JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            })}::jsonb
          )
        `
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
