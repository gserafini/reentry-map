import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  CreateExpansionPriorityRequest,
  ExpansionPriorityFilters,
  ExpansionPrioritySortOptions,
  ExpansionStatus,
  ExpansionResearchStatus,
  ExpansionPhase,
  ExpansionRegion,
} from '@/lib/types/expansion'

// GET /api/admin/expansion-priorities - List expansion priorities with filtering
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

    // Build query using the view that includes progress
    let query = supabase.from('expansion_priorities_with_progress').select('*')

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }
    if (filters.research_status && filters.research_status.length > 0) {
      query = query.in('research_status', filters.research_status)
    }
    if (filters.phase && filters.phase.length > 0) {
      query = query.in('phase', filters.phase)
    }
    if (filters.state && filters.state.length > 0) {
      query = query.in('state', filters.state)
    }
    if (filters.region && filters.region.length > 0) {
      query = query.in('region', filters.region)
    }
    if (filters.min_priority_score !== undefined) {
      query = query.gte('priority_score', filters.min_priority_score)
    }
    if (filters.search) {
      // Full-text search on city, metro_area, strategic_rationale
      query = query.textSearch('city', filters.search.split(' ').join(' & '), {
        type: 'websearch',
      })
    }

    // Apply sorting
    query = query.order(sortField, { ascending: sortDirection === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching expansion priorities:', error)
      return NextResponse.json({ error: 'Failed to fetch expansion priorities' }, { status: 500 })
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count || data?.length || 0,
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

    const body = (await request.json()) as CreateExpansionPriorityRequest

    // Validate required fields
    if (!body.city || !body.state) {
      return NextResponse.json({ error: 'city and state are required' }, { status: 400 })
    }

    // Insert expansion priority
    const { data, error } = await supabase
      .from('expansion_priorities')
      .insert({
        city: body.city,
        state: body.state,
        county: body.county,
        metro_area: body.metro_area,
        region: body.region,
        phase: body.phase,
        population: body.population,
        state_release_volume: body.state_release_volume,
        incarceration_rate: body.incarceration_rate,
        data_availability_score: body.data_availability_score,
        geographic_cluster_bonus: body.geographic_cluster_bonus,
        community_partner_count: body.community_partner_count,
        target_resource_count: body.target_resource_count || 50,
        target_launch_date: body.target_launch_date,
        priority_categories: body.priority_categories || [],
        data_sources: body.data_sources || [],
        strategic_rationale: body.strategic_rationale,
        special_considerations: body.special_considerations,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating expansion priority:', error)
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'Expansion priority for this city/state already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create expansion priority' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/expansion-priorities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
