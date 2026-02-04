import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db, sql } from '@/lib/db/client'
import { expansionPriorities, expansionMilestones } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type {
  UpdateExpansionPriorityRequest,
  CategoryPriority,
  DataSource,
} from '@/lib/types/expansion'

interface ExpansionPriorityWithProgress {
  id: string
  city: string
  state: string
  county: string | null
  metro_area: string | null
  region: string | null
  phase: string | null
  status: string
  research_status: string
  priority_score: number
  population: number | null
  state_release_volume: number | null
  incarceration_rate: number | null
  data_availability_score: number | null
  geographic_cluster_bonus: number | null
  community_partner_count: number | null
  target_resource_count: number | null
  current_resource_count: number | null
  target_launch_date: string | null
  priority_categories: string[] | null
  data_sources: string[] | null
  strategic_rationale: string | null
  special_considerations: string | null
  research_notes: string | null
  blockers: string | null
  research_agent_assigned_at: string | null
  research_agent_completed_at: string | null
  actual_launch_date: string | null
  launched_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/admin/expansion-priorities/[id] - Get single expansion priority
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const { id } = await params

    // Fetch expansion priority with progress from view
    const [data] = await sql<ExpansionPriorityWithProgress[]>`
      SELECT * FROM expansion_priorities_with_progress
      WHERE id = ${id}
      LIMIT 1
    `

    if (!data) {
      return NextResponse.json({ error: 'Expansion priority not found' }, { status: 404 })
    }

    // Fetch milestones
    const milestones = await db
      .select()
      .from(expansionMilestones)
      .where(eq(expansionMilestones.expansionId, id))
      .orderBy(desc(expansionMilestones.milestoneDate))

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
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const { id } = await params
    const body = (await request.json()) as UpdateExpansionPriorityRequest

    // Build update object using Drizzle camelCase schema field names
    const updateData: Partial<{
      city: string
      state: string
      county: string | null
      metroArea: string | null
      region: string | null
      phase: string | null
      population: number | null
      stateReleaseVolume: number | null
      incarcerationRate: number | null
      dataAvailabilityScore: number | null
      geographicClusterBonus: number | null
      communityPartnerCount: number | null
      status: string
      researchStatus: string
      targetLaunchDate: Date | null
      targetResourceCount: number | null
      currentResourceCount: number | null
      priorityCategories: CategoryPriority[]
      dataSources: DataSource[]
      strategicRationale: string | null
      specialConsiderations: string | null
      researchNotes: string | null
      blockers: string | null
      researchAgentAssignedAt: Date | null
      researchAgentCompletedAt: Date | null
      launchedBy: string | null
      actualLaunchDate: Date | null
      updatedAt: Date
    }> = { updatedAt: new Date() }

    // Geographic fields
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.county !== undefined) updateData.county = body.county
    if (body.metro_area !== undefined) updateData.metroArea = body.metro_area
    if (body.region !== undefined) updateData.region = body.region

    // Priority/scoring fields
    if (body.phase !== undefined) updateData.phase = body.phase
    if (body.population !== undefined) updateData.population = body.population
    if (body.state_release_volume !== undefined)
      updateData.stateReleaseVolume = body.state_release_volume
    if (body.incarceration_rate !== undefined)
      updateData.incarcerationRate = body.incarceration_rate
    if (body.data_availability_score !== undefined)
      updateData.dataAvailabilityScore = body.data_availability_score
    if (body.geographic_cluster_bonus !== undefined)
      updateData.geographicClusterBonus = body.geographic_cluster_bonus
    if (body.community_partner_count !== undefined)
      updateData.communityPartnerCount = body.community_partner_count

    // Status fields
    if (body.status !== undefined) updateData.status = body.status
    if (body.research_status !== undefined) updateData.researchStatus = body.research_status

    // Timeline fields
    if (body.target_launch_date !== undefined)
      updateData.targetLaunchDate = body.target_launch_date
        ? new Date(body.target_launch_date)
        : null

    // Resource counts
    if (body.target_resource_count !== undefined)
      updateData.targetResourceCount = body.target_resource_count
    if (body.current_resource_count !== undefined)
      updateData.currentResourceCount = body.current_resource_count

    // JSON fields
    if (body.priority_categories !== undefined)
      updateData.priorityCategories = body.priority_categories
    if (body.data_sources !== undefined) updateData.dataSources = body.data_sources

    // Text fields
    if (body.strategic_rationale !== undefined)
      updateData.strategicRationale = body.strategic_rationale
    if (body.special_considerations !== undefined)
      updateData.specialConsiderations = body.special_considerations
    if (body.research_notes !== undefined) updateData.researchNotes = body.research_notes
    if (body.blockers !== undefined) updateData.blockers = body.blockers

    // Handle research status transitions
    if (body.research_status === 'in_progress' && !updateData.researchAgentAssignedAt) {
      updateData.researchAgentAssignedAt = new Date()
    }
    if (body.research_status === 'completed') {
      updateData.researchAgentCompletedAt = new Date()
    }

    // Handle launched status
    if (body.status === 'launched') {
      updateData.launchedBy = auth.userId || null
      if (!updateData.actualLaunchDate) {
        updateData.actualLaunchDate = new Date()
      }
    }

    if (Object.keys(updateData).length <= 1) {
      // Only updatedAt is set
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update expansion priority
    const [data] = await db
      .update(expansionPriorities)
      .set(updateData)
      .where(eq(expansionPriorities.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: 'Expansion priority not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/admin/expansion-priorities/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/expansion-priorities/[id] - Delete expansion priority
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const { id } = await params

    // Delete expansion priority (cascade will delete milestones)
    const [deleted] = await db
      .delete(expansionPriorities)
      .where(eq(expansionPriorities.id, id))
      .returning({ id: expansionPriorities.id })

    if (!deleted) {
      return NextResponse.json({ error: 'Expansion priority not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in DELETE /api/admin/expansion-priorities/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
