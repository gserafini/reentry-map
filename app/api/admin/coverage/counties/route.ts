import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CountyData, CoverageMetric, CountyWithCoverage } from '@/lib/types/coverage'

/**
 * GET /api/admin/coverage/counties
 *
 * Returns all US counties with geometry for choropleth map visualization
 *
 * Query params:
 * - withGeometry: boolean (default: true) - Include GeoJSON geometry
 * - state: string - Filter by state code (e.g., 'CA')
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    // Default to NOT including geometry - clients should use static GeoJSON file instead
    const withGeometry = searchParams.get('withGeometry') === 'true'
    const stateFilter = searchParams.get('state')

    // Build query - select only needed fields
    // Note: Geometry is excluded by default. Use static file /data/us-counties.geojson for county boundaries.
    // Supabase has a hard limit of 1000 rows per request. We need to paginate to get all counties.
    const selectFields = withGeometry
      ? 'fips_code, state_code, state_name, county_name, center_lat, center_lng, geometry'
      : 'fips_code, state_code, state_name, county_name, center_lat, center_lng'

    // Fetch all counties using pagination (Supabase max is 1000 per request)
    const allCounties: CountyData[] = []
    const pageSize = 1000
    let page = 0
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('county_data')
        .select(selectFields)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      // Apply state filter if provided
      if (stateFilter) {
        query = query.eq('state_code', stateFilter)
      }

      const { data: pageData, error: pageError } = await query

      if (pageError) throw pageError

      if (pageData && pageData.length > 0) {
        allCounties.push(...(pageData as unknown as CountyData[]))
        hasMore = pageData.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    console.log(`[Counties API] Fetched ${allCounties.length} counties total`)

    const counties = allCounties

    // Cast counties to proper type (via unknown to handle Supabase parser types)
    const typedCounties = (counties || []) as unknown as CountyData[]

    // Get coverage metrics for these counties
    const { data: metrics, error: metricsError } = await supabase
      .from('coverage_metrics')
      .select('geography_id, coverage_score, total_resources')
      .eq('geography_type', 'county')

    if (metricsError) console.error('Error fetching metrics:', metricsError)

    // Cast metrics to proper type (subset of CoverageMetric)
    const typedMetrics = (metrics || []) as Array<
      Pick<CoverageMetric, 'geography_id' | 'coverage_score' | 'total_resources'>
    >

    // Merge coverage data with county data
    const countiesWithCoverage: CountyWithCoverage[] = typedCounties.map((county) => {
      const metric = typedMetrics.find((m) => m.geography_id === county.fips_code)
      return {
        ...county,
        coverage_score: metric?.coverage_score || 0,
        total_resources: metric?.total_resources || 0,
      }
    })

    return NextResponse.json({
      counties: countiesWithCoverage,
      total: countiesWithCoverage.length,
    })
  } catch (error) {
    console.error('Error fetching counties:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
