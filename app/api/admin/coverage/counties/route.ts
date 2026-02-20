import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'
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
    // Check admin authentication
    const auth = await checkAdminAuth(request)
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    // Default to NOT including geometry - clients should use static GeoJSON file instead
    const withGeometry = searchParams.get('withGeometry') === 'true'
    const stateFilter = searchParams.get('state')

    // Fetch all counties in a single query (no row limit with postgres.js)
    let counties: CountyData[]

    if (withGeometry && stateFilter) {
      counties = await sql<CountyData[]>`
        SELECT fips_code, state_code, state_name, county_name, center_lat, center_lng, geometry
        FROM county_data
        WHERE state_code = ${stateFilter}
      `
    } else if (withGeometry) {
      counties = await sql<CountyData[]>`
        SELECT fips_code, state_code, state_name, county_name, center_lat, center_lng, geometry
        FROM county_data
      `
    } else if (stateFilter) {
      counties = await sql<CountyData[]>`
        SELECT fips_code, state_code, state_name, county_name, center_lat, center_lng
        FROM county_data
        WHERE state_code = ${stateFilter}
      `
    } else {
      counties = await sql<CountyData[]>`
        SELECT fips_code, state_code, state_name, county_name, center_lat, center_lng
        FROM county_data
      `
    }


    // Get coverage metrics for these counties
    const metrics = await sql<Pick<CoverageMetric, 'geography_id' | 'coverage_score' | 'total_resources'>[]>`
      SELECT geography_id, coverage_score, total_resources
      FROM coverage_metrics
      WHERE geography_type = 'county'
    `

    // Merge coverage data with county data
    const countiesWithCoverage: CountyWithCoverage[] = counties.map((county) => {
      const metric = metrics.find((m) => m.geography_id === county.fips_code)
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
