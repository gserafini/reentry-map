import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'

/**
 * GET /api/verification/next
 * Get next resource to verify (ONE at a time)
 *
 * Returns ONE pending resource suggestion for verification.
 * Prioritized by: missing email > no verification source > oldest submission.
 *
 * Authentication: x-admin-api-key header
 *
 * Response:
 * {
 *   suggestion_id: string,
 *   name: string,
 *   current_data: {
 *     address, city, state, zip,
 *     phone, email, website,
 *     hours, services_offered, etc.
 *   },
 *   discovery_info: {
 *     found_via: string,
 *     discovery_notes: string,
 *     research_task: string
 *   },
 *   priority: {
 *     score: number,  // 100 = highest
 *     reason: string  // Why this is prioritized
 *   },
 *   instructions: string,  // What to verify
 *   approve_url: string,   // POST here to approve
 *   reject_url: string     // POST here to reject
 * }
 *
 * Agent Workflow:
 * 1. Call this endpoint
 * 2. Review current_data
 * 3. WebFetch website (if available) OR WebSearch for organization
 * 4. Extract: email (PRIORITY!), phone, hours, services, eligibility
 * 5. POST to approve_url with corrections and verification_source
 * 6. Call this endpoint again for next resource
 *
 * IMPORTANT: ONE at a time. No batching.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const supabase = auth.getClient()

    // Fetch ONE pending suggestion with priority logic
    // Priority: missing email > incomplete > oldest
    const { data: suggestions, error: fetchError } = await supabase
      .from('resource_suggestions')
      .select(
        `
        *,
        research_tasks (
          county,
          state,
          category
        )
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20) // Get a few to calculate priority

    if (fetchError) {
      console.error('Error fetching suggestions:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
    }

    if (!suggestions || suggestions.length === 0) {
      return NextResponse.json({
        message: 'No resources pending verification',
        details: 'All submitted resources have been verified. Great work!',
        next_action: 'Check GET /api/research/next to start discovering new resources.',
      })
    }

    // Calculate priority for each suggestion
    const prioritized = suggestions.map((s: (typeof suggestions)[0]) => {
      let priority = 50
      let reason = 'Standard verification'

      if (!s.email) {
        priority = 100
        reason = 'Missing email address (highest priority)'
      } else if (!s.phone) {
        priority = 80
        reason = 'Missing phone number'
      } else if (!s.services_offered || (s.services_offered as unknown[])?.length === 0) {
        priority = 75
        reason = 'Missing services description'
      } else if (!s.hours) {
        priority = 70
        reason = 'Missing hours of operation'
      }

      return {
        ...s,
        priority_score: priority,
        priority_reason: reason,
      }
    })

    // Sort by priority
    prioritized.sort(
      (a: { priority_score: number }, b: { priority_score: number }) =>
        b.priority_score - a.priority_score
    )

    const suggestion = prioritized[0]

    // Build verification instructions
    let instructions = `Verify this resource using WebFetch or WebSearch.\n\n`

    if (suggestion.website) {
      instructions += `1. WebFetch: ${suggestion.website}\n`
      instructions += `   Extract: `
    } else {
      instructions += `1. WebSearch: "${suggestion.name} ${suggestion.city} contact"\n`
      instructions += `   Find official website or directory listing\n`
      instructions += `2. Extract: `
    }

    const fieldsToVerify = []
    if (!suggestion.email) fieldsToVerify.push('EMAIL (priority!)')
    if (!suggestion.phone) fieldsToVerify.push('phone')
    if (!suggestion.hours) fieldsToVerify.push('hours')
    if (!suggestion.services_offered || suggestion.services_offered.length === 0)
      fieldsToVerify.push('services')
    if (!suggestion.eligibility_requirements) fieldsToVerify.push('eligibility')

    if (fieldsToVerify.length > 0) {
      instructions += fieldsToVerify.join(', ') + '\n\n'
    } else {
      instructions += 'address, email, phone, hours, services, eligibility\n\n'
    }

    instructions += `3. POST to approve_url with:\n`
    instructions += `   - corrections: {email, phone, hours, services_offered, etc.}\n`
    instructions += `   - correction_notes: "Verified via [website URL or search]. Updated: [list what changed]"\n\n`
    instructions += `REQUIRED: correction_notes must include verification source (URL or search query)\n\n`
    instructions += `See: docs/VERIFICATION_PROTOCOL.md for full guidelines`

    return NextResponse.json({
      suggestion_id: suggestion.id,
      name: suggestion.name,
      current_data: {
        address: suggestion.address,
        city: suggestion.city,
        state: suggestion.state,
        zip: suggestion.zip,
        phone: suggestion.phone,
        email: suggestion.email,
        website: suggestion.website,
        description: suggestion.description,
        category: suggestion.category,
        services_offered: suggestion.services_offered,
        hours: suggestion.hours,
        eligibility_requirements: suggestion.eligibility_requirements,
      },
      discovery_info: {
        found_via: suggestion.discovered_via,
        discovery_notes: suggestion.discovery_notes,
        research_task: suggestion.research_tasks
          ? `${suggestion.research_tasks.county} County, ${suggestion.research_tasks.state} - ${suggestion.research_tasks.category || 'All categories'}`
          : null,
      },
      priority: {
        score: suggestion.priority_score,
        reason: suggestion.priority_reason,
      },
      instructions,
      approve_url: `/api/admin/flagged-resources/${suggestion.id}/approve-with-corrections`,
      reject_url: `/api/admin/flagged-resources/${suggestion.id}/reject`,
      queue_status: {
        total_pending: suggestions.length,
        position: 1, // Always return first by priority
      },
    })
  } catch (error) {
    console.error('Error in verification/next:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
