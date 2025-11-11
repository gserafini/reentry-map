import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateExpansionPriorityRequest } from '@/lib/types/expansion'

// GET /api/admin/expansion-priorities/[id] - Get single expansion priority
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

    // Fetch expansion priority with progress
    const { data, error } = await supabase
      .from('expansion_priorities_with_progress')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expansion priority not found' }, { status: 404 })
      }
      console.error('Error fetching expansion priority:', error)
      return NextResponse.json({ error: 'Failed to fetch expansion priority' }, { status: 500 })
    }

    // Fetch milestones
    const { data: milestones } = await supabase
      .from('expansion_milestones')
      .select('*')
      .eq('expansion_id', id)
      .order('milestone_date', { ascending: false })

    return NextResponse.json({
      ...data,
      milestones: milestones || [],
    })
  } catch (error) {
    console.error('Error in GET /api/admin/expansion-priorities/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/expansion-priorities/[id] - Update expansion priority
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = (await request.json()) as UpdateExpansionPriorityRequest

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {}

    // Geographic fields
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.county !== undefined) updateData.county = body.county
    if (body.metro_area !== undefined) updateData.metro_area = body.metro_area
    if (body.region !== undefined) updateData.region = body.region

    // Priority/scoring fields
    if (body.phase !== undefined) updateData.phase = body.phase
    if (body.population !== undefined) updateData.population = body.population
    if (body.state_release_volume !== undefined)
      updateData.state_release_volume = body.state_release_volume
    if (body.incarceration_rate !== undefined)
      updateData.incarceration_rate = body.incarceration_rate
    if (body.data_availability_score !== undefined)
      updateData.data_availability_score = body.data_availability_score
    if (body.geographic_cluster_bonus !== undefined)
      updateData.geographic_cluster_bonus = body.geographic_cluster_bonus
    if (body.community_partner_count !== undefined)
      updateData.community_partner_count = body.community_partner_count

    // Status fields
    if (body.status !== undefined) updateData.status = body.status
    if (body.research_status !== undefined) updateData.research_status = body.research_status

    // Timeline fields
    if (body.target_launch_date !== undefined)
      updateData.target_launch_date = body.target_launch_date

    // Resource counts
    if (body.target_resource_count !== undefined)
      updateData.target_resource_count = body.target_resource_count
    if (body.current_resource_count !== undefined)
      updateData.current_resource_count = body.current_resource_count

    // JSON fields
    if (body.priority_categories !== undefined)
      updateData.priority_categories = body.priority_categories
    if (body.data_sources !== undefined) updateData.data_sources = body.data_sources

    // Text fields
    if (body.strategic_rationale !== undefined)
      updateData.strategic_rationale = body.strategic_rationale
    if (body.special_considerations !== undefined)
      updateData.special_considerations = body.special_considerations
    if (body.research_notes !== undefined) updateData.research_notes = body.research_notes
    if (body.blockers !== undefined) updateData.blockers = body.blockers

    // Handle research status transitions
    if (
      body.research_status === 'in_progress' &&
      (!updateData.research_agent_assigned_at || updateData.research_agent_assigned_at === null)
    ) {
      updateData.research_agent_assigned_at = new Date().toISOString()
    }
    if (body.research_status === 'completed') {
      updateData.research_agent_completed_at = new Date().toISOString()
    }

    // Handle launched status
    if (body.status === 'launched') {
      updateData.launched_by = user.id
      if (!updateData.actual_launch_date) {
        updateData.actual_launch_date = new Date().toISOString()
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update expansion priority
    const { data, error } = await supabase
      .from('expansion_priorities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating expansion priority:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expansion priority not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update expansion priority' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/admin/expansion-priorities/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/expansion-priorities/[id] - Delete expansion priority
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Delete expansion priority (cascade will delete milestones)
    const { error } = await supabase.from('expansion_priorities').delete().eq('id', id)

    if (error) {
      console.error('Error deleting expansion priority:', error)
      return NextResponse.json({ error: 'Failed to delete expansion priority' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in DELETE /api/admin/expansion-priorities/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
