import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'

interface ExpansionPriorityWithProgress {
  id: string
  city: string
  state: string
  priority_score: number
  target_resource_count: number
  current_resource_count: number
  priority_categories: string[] | null
}

/**
 * GET /api/research/next
 * Get next research task for discovery agents
 *
 * Returns the highest-priority incomplete expansion target with clear instructions.
 * Uses expansion_priorities framework for consistency with Command Center.
 *
 * Authentication: x-admin-api-key header
 *
 * Response:
 * {
 *   task_id: string,          // expansion_priority.id
 *   city: string,
 *   state: string,
 *   categories: string[],      // Priority categories for this city
 *   target_count: number,
 *   current_found: number,
 *   remaining: number,
 *   instructions: string,      // What to search for
 *   suggested_queries: string[], // Example searches
 *   submit_url: string,        // Where to submit candidates
 *   priority_score: number     // 0-1000 composite score
 * }
 *
 * Agent Workflow:
 * 1. Call this endpoint
 * 2. Use WebSearch with suggested_queries
 * 3. For each candidate found:
 *    - WebFetch website to extract details
 *    - POST to submit_url with resource data
 * 4. Repeat until remaining = 0
 * 5. Call this endpoint again for next task
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

    // Get highest-priority incomplete expansion target using raw SQL for the view
    const priorities = await sql<ExpansionPriorityWithProgress[]>`
      SELECT * FROM expansion_priorities_with_progress
      ORDER BY priority_score DESC
      LIMIT 100
    `

    if (!priorities || priorities.length === 0) {
      return NextResponse.json({
        message: 'No research tasks available',
        details: 'No expansion priorities configured yet.',
      })
    }

    // Find first priority that hasn't reached target
    const target = priorities.find(
      (p) => (p.current_resource_count || 0) < (p.target_resource_count || 50)
    )

    if (!target) {
      return NextResponse.json({
        message: 'No research tasks available',
        details: 'All expansion targets have reached their resource goals. Great work!',
      })
    }

    // Get categories (use priority_categories or defaults)
    const categories =
      target.priority_categories && target.priority_categories.length > 0
        ? target.priority_categories
        : [
            'employment',
            'housing',
            'healthcare',
            'legal_aid',
            'substance_abuse_treatment',
            'mental_health',
            'food_assistance',
            'education',
          ]

    // Generate suggested search queries
    const suggestedQueries = [
      `"${target.city}, ${target.state}" reentry services`,
      `"${target.city}, ${target.state}" formerly incarcerated support`,
      ...categories
        .slice(0, 4)
        .map((cat: string) => `"${target.city}, ${target.state}" ${cat.replace(/_/g, ' ')}`),
    ]

    // Calculate remaining
    const remaining = (target.target_resource_count || 50) - (target.current_resource_count || 0)

    // Return standardized response
    return NextResponse.json({
      task_id: target.id,
      city: target.city,
      state: target.state,
      categories,
      target_count: target.target_resource_count || 50,
      current_found: target.current_resource_count || 0,
      remaining,
      instructions: `Find reentry resources in ${target.city}, ${target.state}. Focus on: ${categories.join(', ').replace(/_/g, ' ')}. Target: ${remaining} more resources needed.`,
      suggested_queries: suggestedQueries,
      submit_url: '/api/resources/suggest-batch',
      priority_score: target.priority_score,
      message: `Research ${remaining} resources in ${target.city}, ${target.state}`,
    })
  } catch (error) {
    console.error('Error in research/next:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
