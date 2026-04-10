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

interface ExistingResourceSummary {
  id: string
  name: string
  primary_category: string | null
  address_type: string | null
  verification_status: string | null
}

interface SubmittedResourceSummary {
  id: string
  name: string
  primary_category: string | null
  verification_status: string | null
  created_at: string
}

/**
 * GET /api/research/next
 * Returns the next expansion priority plus enough context to avoid duplicate work.
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

    const target = priorities.find(
      (priority) => (priority.current_resource_count || 0) < (priority.target_resource_count || 50)
    )

    if (!target) {
      return NextResponse.json({
        message: 'No research tasks available',
        details: 'All expansion targets have reached their resource goals. Great work!',
      })
    }

    const categories =
      target.priority_categories && target.priority_categories.length > 0
        ? target.priority_categories
        : [
            'employment',
            'housing',
            'healthcare',
            'legal-aid',
            'substance-abuse',
            'mental-health',
            'food',
            'education',
          ]

    const suggestedQueries = [
      `"${target.city}, ${target.state}" reentry services`,
      `"${target.city}, ${target.state}" formerly incarcerated support`,
      ...categories
        .slice(0, 4)
        .map((category) => `"${target.city}, ${target.state}" ${category.replace(/[-_]/g, ' ')}`),
    ]

    const remaining = (target.target_resource_count || 50) - (target.current_resource_count || 0)

    const existingResources = await sql<ExistingResourceSummary[]>`
      SELECT id, name, primary_category, address_type, verification_status
      FROM resources
      WHERE LOWER(COALESCE(city, '')) = LOWER(${target.city})
        AND LOWER(COALESCE(state, '')) = LOWER(${target.state})
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 25
    `

    const submittedThisTask = await sql<SubmittedResourceSummary[]>`
      SELECT id, name, primary_category, verification_status, created_at
      FROM resources
      WHERE provenance->>'expansion_priority_id' = ${target.id}
      ORDER BY created_at DESC
      LIMIT 25
    `

    return NextResponse.json({
      task_id: target.id,
      city: target.city,
      state: target.state,
      categories,
      target_count: target.target_resource_count || 50,
      current_found: target.current_resource_count || 0,
      remaining,
      instructions: `Find reentry resources in ${target.city}, ${target.state}. Publish trusted finds directly, then let verification sweeps catch issues later.`,
      suggested_queries: suggestedQueries,
      submit_url: '/api/research/submit-candidate',
      intake_url: '/admin/research-intake',
      submission_mode: 'publish_live_pending_verification',
      priority_score: target.priority_score,
      message: `Research ${remaining} resources in ${target.city}, ${target.state}`,
      existing_resources: existingResources,
      submitted_this_task: submittedThisTask,
    })
  } catch (error) {
    console.error('Error in research/next:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
