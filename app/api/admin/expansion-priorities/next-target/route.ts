import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { expansionPriorities, expansionMilestones } from '@/lib/db/schema'
import { eq, inArray, desc } from 'drizzle-orm'
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
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
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

    // Default filters for research-ready targets
    const statusValues = filters.status?.length ? filters.status : ['identified', 'researching']
    const researchStatusValues = filters.research_status?.length
      ? filters.research_status
      : ['not_started', 'blocked']

    // Execute query with Drizzle
    let query = db
      .select()
      .from(expansionPriorities)
      .where(inArray(expansionPriorities.status, statusValues))
      .orderBy(desc(expansionPriorities.priorityScore))
      .$dynamic()

    // Filter by research status
    if (researchStatusValues.length > 0) {
      query = query.where(inArray(expansionPriorities.researchStatus, researchStatusValues))
    }

    // Filter by phase if provided
    if (filters.phase && filters.phase.length > 0) {
      query = query.where(inArray(expansionPriorities.phase, filters.phase))
    }

    // Apply limit
    const limit = filters.limit || 1
    query = query.limit(limit)

    const data = await query

    // Return single object if limit=1, array otherwise
    if (limit === 1) {
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
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Parse request body for filters
    const body = (await request.json()) as NextResearchTargetRequest

    // Build query conditions
    const statusValues = body.status?.length ? body.status : ['identified']
    const researchStatusValues = body.research_status?.length
      ? body.research_status
      : ['not_started']

    // Execute query with Drizzle
    let query = db
      .select()
      .from(expansionPriorities)
      .where(inArray(expansionPriorities.status, statusValues))
      .orderBy(desc(expansionPriorities.priorityScore))
      .$dynamic()

    // Filter by research status
    if (researchStatusValues.length > 0) {
      if (researchStatusValues.length === 1) {
        query = query.where(eq(expansionPriorities.researchStatus, researchStatusValues[0]))
      } else {
        query = query.where(inArray(expansionPriorities.researchStatus, researchStatusValues))
      }
    }

    // Filter by phase if provided
    if (body.phase && body.phase.length > 0) {
      query = query.where(inArray(expansionPriorities.phase, body.phase))
    }

    query = query.limit(1)

    const data = await query

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No research targets available' }, { status: 404 })
    }

    const target = data[0]

    // Update to mark as in_progress and set assigned timestamp
    const [updated] = await db
      .update(expansionPriorities)
      .set({
        status: 'researching',
        researchStatus: 'in_progress',
        researchAgentAssignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(expansionPriorities.id, target.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Failed to claim research target' }, { status: 500 })
    }

    // Create milestone for research started
    await db.insert(expansionMilestones).values({
      expansionId: target.id,
      milestoneType: 'research_started',
      notes: 'Research agent assigned and started',
      achievedBy: auth.userId || null,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error in POST /api/admin/expansion-priorities/next-target:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
