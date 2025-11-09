import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/coverage/county/[fips]
 *
 * Returns detailed coverage metrics for a specific county
 *
 * Params:
 * - fips: 5-digit FIPS code (e.g., "06001" for Alameda County, CA)
 *
 * Returns:
 * - County reference data
 * - Coverage metrics
 * - Resource breakdown by category
 * - Comparison to state and national averages
 *
 * Requires admin authentication
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ fips: string }> }) {
  try {
    const { fips } = await params
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

    // Get county reference data
    const { data: county, error: countyError } = await supabase
      .from('county_data')
      .select('*')
      .eq('fips_code', fips)
      .single()

    if (countyError || !county) {
      return NextResponse.json({ error: 'County not found' }, { status: 404 })
    }

    // Get coverage metrics for this county
    const { data: metrics, error: metricsError } = await supabase
      .from('coverage_metrics')
      .select('*')
      .eq('geography_type', 'county')
      .eq('geography_id', fips)
      .single()

    if (metricsError && metricsError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (county has no metrics yet)
      throw metricsError
    }

    // Get resources in this county
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('id, name, primary_category, city, is_unique, completeness_score, verification_score, review_count')
      .eq('county_fips', fips)
      .eq('status', 'active')
      .order('name')

    if (resourcesError) throw resourcesError

    // Group resources by category
    const categoryCounts: Record<string, number> = {}
    resources?.forEach((r) => {
      categoryCounts[r.primary_category] = (categoryCounts[r.primary_category] || 0) + 1
    })

    // Get state-level comparison
    const { data: stateMetrics, error: stateError } = await supabase
      .from('coverage_metrics')
      .select('*')
      .eq('geography_type', 'state')
      .eq('geography_id', county.state_code)
      .single()

    if (stateError && stateError.code !== 'PGRST116') {
      throw stateError
    }

    // Get national comparison
    const { data: nationalMetrics, error: nationalError } = await supabase
      .from('coverage_metrics')
      .select('*')
      .eq('geography_type', 'national')
      .eq('geography_id', 'US')
      .single()

    if (nationalError && nationalError.code !== 'PGRST116') {
      throw nationalError
    }

    // Calculate county rank within state
    const { data: stateCounties, error: stateCountiesError } = await supabase
      .from('coverage_metrics')
      .select('geography_id, coverage_score')
      .eq('geography_type', 'county')
      .like('geography_id', `${county.state_fips}%`)
      .order('coverage_score', { ascending: false })

    if (stateCountiesError) throw stateCountiesError

    const countyRank = stateCounties?.findIndex((c) => c.geography_id === fips) + 1 || null
    const totalCountiesInState = stateCounties?.length || 0

    return NextResponse.json({
      county: {
        fips_code: county.fips_code,
        name: county.county_name,
        state: county.state_name,
        state_code: county.state_code,
        population: county.total_population,
        reentry_population: county.estimated_annual_releases,
        priority_tier: county.priority_tier,
        priority_reason: county.priority_reason,
        center_lat: county.center_lat,
        center_lng: county.center_lng,
      },
      metrics: metrics || {
        coverage_score: 0,
        total_resources: 0,
        verified_resources: 0,
        categories_covered: 0,
        unique_resources: 0,
      },
      resources: {
        total: resources?.length || 0,
        by_category: categoryCounts,
        unique_count: resources?.filter((r) => r.is_unique).length || 0,
        with_reviews: resources?.filter((r) => r.review_count > 0).length || 0,
        list: resources || [],
      },
      comparison: {
        state: {
          name: county.state_name,
          coverage_score: stateMetrics?.coverage_score || 0,
          total_resources: stateMetrics?.total_resources || 0,
        },
        national: {
          coverage_score: nationalMetrics?.coverage_score || 0,
          total_resources: nationalMetrics?.total_resources || 0,
        },
        rank_in_state: countyRank,
        total_counties_in_state: totalCountiesInState,
      },
    })
  } catch (error) {
    console.error('Error fetching county coverage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
