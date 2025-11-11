import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  NextResearchTargetRequest,
  ExpansionStatus,
  ExpansionResearchStatus,
  ExpansionPhase,
} from '@/lib/types/expansion'

// GET /api/admin/expansion-priorities/next-target
// Returns the highest-priority location(s) ready for research by AI agents
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const filters: NextResearchTargetRequest = {
      status: searchParams.get('status')?.split(',') as ExpansionStatus[] | undefined,
      research_status: searchParams.get('research_status')?.split(',') as
        | ExpansionResearchStatus[]
        | undefined,
      phase: searchParams.get('phase')?.split(',') as ExpansionPhase[] | undefined,
      limit: parseInt(searchParams.get('limit') || '1'),
    }

    // Build query for next research target
    let query = supabase
      .from('expansion_priorities')
      .select('*')
      .order('priority_score', { ascending: false })

    // Default filters for research-ready targets
    if (!filters.status || filters.status.length === 0) {
      query = query.in('status', ['identified', 'researching'])
    } else {
      query = query.in('status', filters.status)
    }

    if (!filters.research_status || filters.research_status.length === 0) {
      query = query.in('research_status', ['not_started', 'blocked'])
    } else {
      query = query.in('research_status', filters.research_status)
    }

    if (filters.phase && filters.phase.length > 0) {
      query = query.in('phase', filters.phase)
    }

    // Apply limit (default to 1 if not provided or invalid)
    query = query.limit(filters.limit || 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching next research target:', error)
      return NextResponse.json({ error: 'Failed to fetch next research target' }, { status: 500 })
    }

    // Return single object if limit=1, array otherwise
    if (filters.limit === 1) {
      return NextResponse.json(data?.[0] || null)
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/admin/expansion-priorities/next-target:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/expansion-priorities/next-target
// Claims the next research target and marks it as in_progress
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body for filters
    const body = (await request.json()) as NextResearchTargetRequest

    // Build query for next research target
    let query = supabase
      .from('expansion_priorities')
      .select('*')
      .order('priority_score', { ascending: false })

    // Default filters for research-ready targets
    if (!body.status || body.status.length === 0) {
      query = query.in('status', ['identified'])
    } else {
      query = query.in('status', body.status)
    }

    if (!body.research_status || body.research_status.length === 0) {
      query = query.eq('research_status', 'not_started')
    } else {
      query = query.in('research_status', body.research_status)
    }

    if (body.phase && body.phase.length > 0) {
      query = query.in('phase', body.phase)
    }

    query = query.limit(1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching next research target:', error)
      return NextResponse.json({ error: 'Failed to fetch next research target' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No research targets available' }, { status: 404 })
    }

    const target = data[0]

    // Update to mark as in_progress and set assigned timestamp
    const { data: updated, error: updateError } = await supabase
      .from('expansion_priorities')
      .update({
        status: 'researching',
        research_status: 'in_progress',
        research_agent_assigned_at: new Date().toISOString(),
      })
      .eq('id', target.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error claiming research target:', updateError)
      return NextResponse.json({ error: 'Failed to claim research target' }, { status: 500 })
    }

    // Create milestone for research started
    await supabase.from('expansion_milestones').insert({
      expansion_id: target.id,
      milestone_type: 'research_started',
      notes: 'Research agent assigned and started',
      achieved_by: user.id,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error in POST /api/admin/expansion-priorities/next-target:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
