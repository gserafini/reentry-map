import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db, sql } from '@/lib/db/client'
import { expansionPriorities } from '@/lib/db/schema'
import type {
  CreateExpansionPriorityRequest,
  ExpansionPriorityFilters,
  ExpansionPrioritySortOptions,
  ExpansionStatus,
  ExpansionResearchStatus,
  ExpansionPhase,
  ExpansionRegion,
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

// GET /api/admin/expansion-priorities - List expansion priorities with filtering
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
    const filters: ExpansionPriorityFilters = {
      status: searchParams.get('status')?.split(',') as ExpansionStatus[] | undefined,
      research_status: searchParams.get('research_status')?.split(',') as
        | ExpansionResearchStatus[]
        | undefined,
      phase: searchParams.get('phase')?.split(',') as ExpansionPhase[] | undefined,
      state: searchParams.get('state')?.split(','),
      region: searchParams.get('region')?.split(',') as ExpansionRegion[] | undefined,
      min_priority_score: searchParams.get('min_priority_score')
        ? parseInt(searchParams.get('min_priority_score')!)
        : undefined,
      search: searchParams.get('search') || undefined,
    }

    const sortField =
      (searchParams.get('sort_field') as ExpansionPrioritySortOptions['field']) || 'priority_score'
    const sortDirection = (searchParams.get('sort_direction') as 'asc' | 'desc') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query using the view that includes progress (using raw SQL)
    // This is simpler than trying to build dynamic WHERE clauses
    let whereClause = 'WHERE 1=1'
    const params: (string | string[] | number)[] = []
    let paramIndex = 1

    if (filters.status && filters.status.length > 0) {
      whereClause += ` AND status = ANY($${paramIndex++}::text[])`
      params.push(filters.status)
    }
    if (filters.research_status && filters.research_status.length > 0) {
      whereClause += ` AND research_status = ANY($${paramIndex++}::text[])`
      params.push(filters.research_status)
    }
    if (filters.phase && filters.phase.length > 0) {
      whereClause += ` AND phase = ANY($${paramIndex++}::text[])`
      params.push(filters.phase)
    }
    if (filters.state && filters.state.length > 0) {
      whereClause += ` AND state = ANY($${paramIndex++}::text[])`
      params.push(filters.state)
    }
    if (filters.region && filters.region.length > 0) {
      whereClause += ` AND region = ANY($${paramIndex++}::text[])`
      params.push(filters.region)
    }
    if (filters.min_priority_score !== undefined) {
      whereClause += ` AND priority_score >= $${paramIndex++}`
      params.push(filters.min_priority_score)
    }
    if (filters.search) {
      whereClause += ` AND city ILIKE $${paramIndex++}`
      params.push(`%${filters.search}%`)
    }

    const orderClause = `ORDER BY ${sortField} ${sortDirection === 'asc' ? 'ASC' : 'DESC'}`
    const limitClause = `LIMIT ${limit} OFFSET ${offset}`

    // Execute query (using raw SQL for view)
    // expansion_priorities_with_progress view may not exist yet — return empty
    let data: ExpansionPriorityWithProgress[] = []
    try {
      data = await sql.unsafe<ExpansionPriorityWithProgress[]>(
        `SELECT * FROM expansion_priorities_with_progress ${whereClause} ${orderClause} ${limitClause}`,
        params
      )
    } catch (queryError) {
      console.warn('expansion_priorities_with_progress view not available:', queryError)
    }

    return NextResponse.json({
      data,
      pagination: {
        total: data?.length || 0,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/admin/expansion-priorities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/expansion-priorities - Create new expansion priority
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const body = (await request.json()) as CreateExpansionPriorityRequest

    // Validate required fields
    if (!body.city || !body.state) {
      return NextResponse.json({ error: 'city and state are required' }, { status: 400 })
    }

    // Insert expansion priority (table may not exist yet)
    try {
      const [data] = await db
        .insert(expansionPriorities)
        .values({
          city: body.city,
          state: body.state,
          county: body.county,
          metroArea: body.metro_area,
          region: body.region,
          phase: body.phase,
          population: body.population,
          stateReleaseVolume: body.state_release_volume,
          incarcerationRate: body.incarceration_rate,
          dataAvailabilityScore: body.data_availability_score,
          geographicClusterBonus: body.geographic_cluster_bonus,
          communityPartnerCount: body.community_partner_count,
          targetResourceCount: body.target_resource_count || 50,
          targetLaunchDate: body.target_launch_date ? new Date(body.target_launch_date) : null,
          priorityCategories: body.priority_categories || [],
          dataSources: body.data_sources || [],
          strategicRationale: body.strategic_rationale,
          specialConsiderations: body.special_considerations,
          createdBy: auth.userId || null,
        })
        .returning()

      return NextResponse.json(data, { status: 201 })
    } catch (insertError) {
      const errorCode = (insertError as { code?: string }).code
      if (errorCode === '23505') {
        return NextResponse.json(
          { error: 'Expansion priority for this city/state already exists' },
          { status: 409 }
        )
      }
      if (errorCode === '42P01') {
        // Table doesn't exist
        return NextResponse.json(
          { error: 'Expansion priorities feature not yet deployed' },
          { status: 501 }
        )
      }
      throw insertError
    }
  } catch (error) {
    console.error('Error in POST /api/admin/expansion-priorities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
