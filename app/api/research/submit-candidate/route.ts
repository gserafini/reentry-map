import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resourceSuggestions, researchTasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/research/submit-candidate
 * Submit a resource candidate found during research
 *
 * Agents call this ONE at a time (no batching!) to submit discovered resources.
 *
 * Authentication: x-admin-api-key header
 *
 * Body:
 * {
 *   task_id: string,          // From GET /api/research/next
 *   name: string,             // Organization name
 *   address?: string,
 *   city?: string,
 *   state?: string,
 *   zip?: string,
 *   phone?: string,
 *   email?: string,
 *   website?: string,
 *   description?: string,
 *   category?: string,
 *   services_offered?: string[],
 *   discovered_via: 'websearch' | 'webfetch' | 'manual',
 *   discovery_notes: string   // REQUIRED: What search found this, source URL, etc.
 * }
 *
 * Validation:
 * - discovery_notes is required (documents how resource was found)
 * - Must include source (search query OR website URL)
 * - At minimum: name and (address OR website OR phone)
 *
 * Response:
 * {
 *   success: true,
 *   suggestion_id: string,
 *   task_progress: {
 *     found: number,
 *     target: number,
 *     remaining: number,
 *     task_complete: boolean
 *   },
 *   next_action: string  // Instructions for what to do next
 * }
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

    const body = (await request.json()) as {
      task_id: string
      name: string
      address?: string
      city?: string
      state?: string
      zip?: string
      phone?: string
      email?: string
      website?: string
      description?: string
      category?: string
      services_offered?: string[]
      hours?: Record<string, unknown>
      eligibility_requirements?: string
      discovered_via?: string
      discovery_notes?: string
    }

    const {
      task_id,
      name,
      address,
      city,
      state,
      zip,
      phone,
      email,
      website,
      description,
      category,
      services_offered,
      hours,
      eligibility_requirements,
      discovered_via,
      discovery_notes,
    } = body

    // Validation: Required fields
    if (!task_id) {
      return NextResponse.json(
        {
          error: 'task_id is required',
          details: 'Must include task_id from GET /api/research/next',
        },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { error: 'name is required', details: 'Resource must have a name' },
        { status: 400 }
      )
    }

    if (!discovery_notes) {
      return NextResponse.json(
        {
          error: 'discovery_notes is required',
          details:
            'Must document how this was found: search query used, website URL, etc. Example: "Found via WebSearch: Contra Costa food pantries. Website: https://example.org"',
        },
        { status: 400 }
      )
    }

    // Validation: Must have some contact/location info
    if (!address && !website && !phone) {
      return NextResponse.json(
        {
          error: 'Insufficient contact information',
          details: 'Must include at least one of: address, website, or phone',
        },
        { status: 400 }
      )
    }

    // Verify task exists and is in_progress
    const [task] = await db
      .select()
      .from(researchTasks)
      .where(eq(researchTasks.id, task_id))
      .limit(1)

    if (!task) {
      return NextResponse.json(
        { error: 'Research task not found', details: 'Invalid task_id or task was deleted' },
        { status: 404 }
      )
    }

    if (task.status !== 'in_progress') {
      return NextResponse.json(
        {
          error: 'Task not active',
          details: `Task status is "${task.status}". Only in_progress tasks can receive submissions.`,
        },
        { status: 400 }
      )
    }

    // Create resource suggestion
    let suggestion: { id: string } | undefined
    try {
      const [created] = await db
        .insert(resourceSuggestions)
        .values({
          name,
          address,
          city: city || task.county, // Default to task county if not specified
          state: state || task.state, // Default to task state
          zip,
          phone,
          email,
          website,
          description,
          category: category || task.category,
          primaryCategory: category || task.category,
          servicesOffered: services_offered,
          hours,
          eligibilityRequirements: eligibility_requirements,
          status: 'pending', // Awaits verification
          researchTaskId: task_id,
          discoveredVia: discovered_via || 'websearch',
          discoveryNotes: discovery_notes,
        })
        .returning({ id: resourceSuggestions.id })
      suggestion = created
    } catch (createError) {
      console.error('Error creating suggestion:', createError)
      return NextResponse.json(
        { error: 'Failed to create suggestion', details: String(createError) },
        { status: 500 }
      )
    }

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Failed to create suggestion', details: 'No suggestion returned' },
        { status: 500 }
      )
    }

    // Fetch updated task progress (trigger will have updated it)
    const [updatedTask] = await db
      .select({
        resourcesFound: researchTasks.resourcesFound,
        targetCount: researchTasks.targetCount,
        status: researchTasks.status,
      })
      .from(researchTasks)
      .where(eq(researchTasks.id, task_id))
      .limit(1)

    const remaining = updatedTask
      ? (updatedTask.targetCount || 20) - (updatedTask.resourcesFound || 0)
      : (task.targetCount || 20) - (task.resourcesFound || 0) - 1

    const taskComplete = updatedTask?.status === 'completed' || remaining <= 0

    return NextResponse.json({
      success: true,
      suggestion_id: suggestion.id,
      task_progress: {
        found: updatedTask?.resourcesFound || (task.resourcesFound || 0) + 1,
        target: task.targetCount || 20,
        remaining: Math.max(0, remaining),
        task_complete: taskComplete,
      },
      next_action: taskComplete
        ? 'Task complete! Call GET /api/research/next for your next research task.'
        : `Continue researching. Find ${remaining} more resources in ${task.county} County, ${task.state}. Submit each candidate individually.`,
    })
  } catch (error) {
    console.error('Error in research/submit-candidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
