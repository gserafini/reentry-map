import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { expansionPriorities, expansionMilestones } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { CreateMilestoneRequest } from '@/lib/types/expansion'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/admin/expansion-priorities/[id]/milestones - Get all milestones for expansion
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

    // Fetch milestones
    const data = await db
      .select()
      .from(expansionMilestones)
      .where(eq(expansionMilestones.expansionId, id))
      .orderBy(desc(expansionMilestones.milestoneDate))

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/admin/expansion-priorities/[id]/milestones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/expansion-priorities/[id]/milestones - Create milestone
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const { id } = await params
    const body = (await request.json()) as Omit<CreateMilestoneRequest, 'expansion_id'>

    // Validate required fields
    if (!body.milestone_type) {
      return NextResponse.json({ error: 'milestone_type is required' }, { status: 400 })
    }

    // Verify expansion priority exists
    const [expansion] = await db
      .select({ id: expansionPriorities.id })
      .from(expansionPriorities)
      .where(eq(expansionPriorities.id, id))
      .limit(1)

    if (!expansion) {
      return NextResponse.json({ error: 'Expansion priority not found' }, { status: 404 })
    }

    // Create milestone
    const [data] = await db
      .insert(expansionMilestones)
      .values({
        expansionId: id,
        milestoneType: body.milestone_type,
        notes: body.notes,
        metadata: body.metadata || {},
        achievedBy: auth.userId || null,
      })
      .returning()

    if (!data) {
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
    }

    // Auto-update expansion priority based on milestone type
    const updates: Partial<{
      researchStatus: string
      researchAgentAssignedAt: Date
      researchAgentCompletedAt: Date
      status: string
      launchedBy: string | null
      actualLaunchDate: Date
      updatedAt: Date
    }> = { updatedAt: new Date() }

    switch (body.milestone_type) {
      case 'research_started':
        updates.researchStatus = 'in_progress'
        updates.researchAgentAssignedAt = new Date()
        break
      case 'research_completed':
        updates.researchStatus = 'completed'
        updates.researchAgentCompletedAt = new Date()
        break
      case 'ready_for_review':
        updates.status = 'ready_for_launch'
        break
      case 'approved_for_launch':
        updates.status = 'ready_for_launch'
        break
      case 'launched':
        updates.status = 'launched'
        updates.launchedBy = auth.userId || null
        updates.actualLaunchDate = new Date()
        break
    }

    if (Object.keys(updates).length > 1) {
      await db.update(expansionPriorities).set(updates).where(eq(expansionPriorities.id, id))
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/expansion-priorities/[id]/milestones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
