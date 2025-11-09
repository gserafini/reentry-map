import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/coverage/metrics
 *
 * Returns comprehensive coverage metrics at all geographic levels:
 * - National coverage
 * - State-level coverage
 * - County-level coverage (top performing)
 * - City-level coverage (top performing)
 *
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const geographyType = searchParams.get('type') // Filter by geography_type
    const minScore = searchParams.get('minScore') // Filter by minimum coverage score
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query
    let query = supabase
      .from('coverage_metrics')
      .select('*')
      .order('coverage_score', { ascending: false })
      .limit(limit)

    if (geographyType) {
      query = query.eq('geography_type', geographyType)
    }

    if (minScore) {
      query = query.gte('coverage_score', parseFloat(minScore))
    }

    const { data: metrics, error: metricsError } = await query

    if (metricsError) throw metricsError

    // Get national metrics
    const national = metrics?.find((m) => m.geography_type === 'national') || null

    // Get state metrics
    const states = metrics?.filter((m) => m.geography_type === 'state') || []

    // Get top 10 counties
    const counties =
      metrics
        ?.filter((m) => m.geography_type === 'county')
        .sort((a, b) => b.coverage_score - a.coverage_score)
        .slice(0, 10) || []

    // Get top 10 cities
    const cities =
      metrics
        ?.filter((m) => m.geography_type === 'city')
        .sort((a, b) => b.coverage_score - a.coverage_score)
        .slice(0, 10) || []

    // Calculate summary statistics
    const totalCountiesWithCoverage = metrics?.filter((m) => m.geography_type === 'county').length || 0
    const totalCitiesWithCoverage = metrics?.filter((m) => m.geography_type === 'city').length || 0

    // Get Tier 1 county coverage (high priority counties)
    const { data: tier1Counties, error: tier1Error } = await supabase
      .from('county_data')
      .select('fips_code, county_name, state_code, priority_tier')
      .eq('priority_tier', 1)

    if (tier1Error) console.error('Error fetching tier 1 counties:', tier1Error)

    const tier1Count = tier1Counties?.length || 0
    const tier1WithCoverage =
      tier1Counties?.filter((county) => metrics?.some((m) => m.geography_id === county.fips_code && m.total_resources > 0))
        .length || 0

    const tier1CoveragePercent = tier1Count > 0 ? (tier1WithCoverage / tier1Count) * 100 : 0

    return NextResponse.json({
      summary: {
        last_updated: metrics?.[0]?.last_updated || new Date().toISOString(),
        total_resources: national?.total_resources || 0,
        national_coverage: national?.coverage_score || 0,
        states_with_coverage: states.length,
        counties_with_coverage: totalCountiesWithCoverage,
        cities_with_coverage: totalCitiesWithCoverage,
        tier1_counties_total: tier1Count,
        tier1_counties_covered: tier1WithCoverage,
        tier1_coverage_percent: Math.round(tier1CoveragePercent * 100) / 100,
      },
      national,
      states: states.slice(0, 20), // Top 20 states
      counties,
      cities,
    })
  } catch (error) {
    console.error('Error fetching coverage metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
