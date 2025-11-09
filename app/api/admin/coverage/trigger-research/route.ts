import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/coverage/trigger-research
 *
 * Triggers AI research agent to discover resources for a specific county
 *
 * Body:
 * - county_fips: string (5-digit FIPS code, e.g., "06001")
 * - categories?: string[] (optional - specific categories to research)
 * - priority?: 'high' | 'medium' | 'low' (default: based on county tier)
 *
 * Returns:
 * - success: boolean
 * - job_id: string (for tracking research progress)
 * - estimated_completion: ISO timestamp
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

    const body = (await request.json()) as { county_fips?: string; categories?: string[]; priority?: string }
    const { county_fips, categories, priority } = body

    if (!county_fips) {
      return NextResponse.json({ error: 'county_fips is required' }, { status: 400 })
    }

    // Get county data
    const { data: county, error: countyError } = await supabase
      .from('county_data')
      .select('*')
      .eq('fips_code', county_fips)
      .single()

    if (countyError || !county) {
      return NextResponse.json({ error: 'County not found' }, { status: 404 })
    }

    // Determine priority from county tier if not specified
    const researchPriority = priority || (county.priority_tier <= 2 ? 'high' : county.priority_tier <= 3 ? 'medium' : 'low')

    // Create job ID
    const jobId = `research-${county_fips}-${Date.now()}`

    // Log the research request to ai_agent_logs
    const { error: logError } = await supabase.from('ai_agent_logs').insert({
      agent_type: 'discovery',
      operation: 'county_research',
      input_data: {
        county_fips,
        county_name: county.county_name,
        state: county.state_code,
        categories: categories || 'all',
        priority: researchPriority,
        job_id: jobId,
      },
      status: 'pending',
      initiated_by: user.id,
    })

    if (logError) {
      console.error('Error logging research request:', logError)
      // Continue anyway - logging failure shouldn't block the request
    }

    // Estimate completion time based on priority
    const estimatedMinutes = researchPriority === 'high' ? 15 : researchPriority === 'medium' ? 30 : 60

    const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000)

    // TODO: Actually trigger the AI research agent
    // For now, this is a placeholder that logs the request
    // Future implementation will:
    // 1. Queue the research job in a background task queue
    // 2. AI agent will:
    //    - Search 211 directory for this county
    //    - Search government databases
    //    - Perform Google searches for each category
    //    - Geocode and verify all discovered resources
    //    - Add resources to database with ai_enriched=true
    //    - Update coverage metrics
    // 3. Admin receives notification when complete

    console.log(`[RESEARCH REQUEST] County: ${county.county_name}, ${county.state_code}`)
    console.log(`[RESEARCH REQUEST] Job ID: ${jobId}`)
    console.log(`[RESEARCH REQUEST] Priority: ${researchPriority}`)
    console.log(`[RESEARCH REQUEST] Categories: ${categories?.join(', ') || 'all'}`)

    return NextResponse.json({
      success: true,
      job_id: jobId,
      county: {
        fips: county_fips,
        name: county.county_name,
        state: county.state_code,
        priority_tier: county.priority_tier,
      },
      research_config: {
        priority: researchPriority,
        categories: categories || 'all',
      },
      status: 'pending',
      estimated_completion: estimatedCompletion.toISOString(),
      message:
        'Research job queued successfully. Note: AI research agent is not yet implemented. This endpoint currently logs the request for future implementation.',
    })
  } catch (error) {
    console.error('Error triggering research:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
