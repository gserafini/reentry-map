import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateMilestoneRequest } from '@/lib/types/expansion'

// GET /api/admin/expansion-priorities/[id]/milestones - Get all milestones for expansion
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    // Fetch milestones
    const { data, error } = await supabase
      .from('expansion_milestones')
      .select('*')
      .eq('expansion_id', id)
      .order('milestone_date', { ascending: false })

    if (error) {
      console.error('Error fetching milestones:', error)
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/admin/expansion-priorities/[id]/milestones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/expansion-priorities/[id]/milestones - Create milestone
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    const body = (await request.json()) as Omit<CreateMilestoneRequest, 'expansion_id'>

    // Validate required fields
    if (!body.milestone_type) {
      return NextResponse.json({ error: 'milestone_type is required' }, { status: 400 })
    }

    // Verify expansion priority exists
    const { data: expansion, error: expansionError } = await supabase
      .from('expansion_priorities')
      .select('id')
      .eq('id', id)
      .single()

    if (expansionError || !expansion) {
      return NextResponse.json({ error: 'Expansion priority not found' }, { status: 404 })
    }

    // Create milestone
    const { data, error } = await supabase
      .from('expansion_milestones')
      .insert({
        expansion_id: id,
        milestone_type: body.milestone_type,
        notes: body.notes,
        metadata: body.metadata || {},
        achieved_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating milestone:', error)
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
    }

    // Auto-update expansion priority based on milestone type
    const updates: Record<string, string> = {}

    switch (body.milestone_type) {
      case 'research_started':
        updates.research_status = 'in_progress'
        updates.research_agent_assigned_at = new Date().toISOString()
        break
      case 'research_completed':
        updates.research_status = 'completed'
        updates.research_agent_completed_at = new Date().toISOString()
        break
      case 'ready_for_review':
        updates.status = 'ready_for_launch'
        break
      case 'approved_for_launch':
        updates.status = 'ready_for_launch'
        break
      case 'launched':
        updates.status = 'launched'
        updates.launched_by = user.id
        if (!updates.actual_launch_date) {
          updates.actual_launch_date = new Date().toISOString()
        }
        break
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('expansion_priorities').update(updates).eq('id', id)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/expansion-priorities/[id]/milestones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
