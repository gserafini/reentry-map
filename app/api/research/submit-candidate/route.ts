import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'

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

    const supabase = auth.getClient()
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
    const { data: task, error: taskError } = await supabase
      .from('research_tasks')
      .select('*')
      .eq('id', task_id)
      .single()

    if (taskError || !task) {
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
    const { data: suggestion, error: createError } = await supabase
      .from('resource_suggestions')
      .insert({
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
        primary_category: category || task.category,
        services_offered,
        hours,
        eligibility_requirements,
        status: 'pending', // Awaits verification
        research_task_id: task_id,
        discovered_via: discovered_via || 'websearch',
        discovery_notes,
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating suggestion:', createError)
      return NextResponse.json(
        { error: 'Failed to create suggestion', details: createError.message },
        { status: 500 }
      )
    }

    // Fetch updated task progress (trigger will have updated it)
    const { data: updatedTask } = await supabase
      .from('research_tasks')
      .select('resources_found, target_count, status')
      .eq('id', task_id)
      .single()

    const remaining = updatedTask
      ? updatedTask.target_count - updatedTask.resources_found
      : task.target_count - task.resources_found - 1

    const taskComplete = updatedTask?.status === 'completed' || remaining <= 0

    return NextResponse.json({
      success: true,
      suggestion_id: suggestion.id,
      task_progress: {
        found: updatedTask?.resources_found || task.resources_found + 1,
        target: task.target_count,
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
