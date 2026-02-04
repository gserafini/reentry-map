import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'

type MetricRow = {
  geography_type: string
  geography_id: string
  geography_name: string
  coverage_score: number
  total_resources: number
  verified_resources: number
  categories_covered: number
  unique_resources: number
  avg_completeness_score: number
  avg_verification_score: number
  resources_with_reviews: number
  reentry_population: number
  last_updated: string
}

type Tier1CountyRow = {
  fips_code: string
  county_name: string
  state_code: string
  priority_tier: number
}

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
    const auth = await checkAdminAuth(request)
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const geographyType = searchParams.get('type') // Filter by geography_type
    const minScore = searchParams.get('minScore') // Filter by minimum coverage score
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query with conditional filters
    const metrics =
      geographyType && minScore
        ? await sql<MetricRow[]>`SELECT * FROM coverage_metrics WHERE geography_type = ${geographyType} AND coverage_score >= ${parseFloat(minScore)} ORDER BY coverage_score DESC LIMIT ${limit}`
        : geographyType
          ? await sql<MetricRow[]>`SELECT * FROM coverage_metrics WHERE geography_type = ${geographyType} ORDER BY coverage_score DESC LIMIT ${limit}`
          : minScore
            ? await sql<MetricRow[]>`SELECT * FROM coverage_metrics WHERE coverage_score >= ${parseFloat(minScore)} ORDER BY coverage_score DESC LIMIT ${limit}`
            : await sql<MetricRow[]>`SELECT * FROM coverage_metrics ORDER BY coverage_score DESC LIMIT ${limit}`

    // Get national metrics
    const national = metrics.find((m) => m.geography_type === 'national') || null

    // Get state metrics
    const states = metrics.filter((m) => m.geography_type === 'state')

    // Get top 10 counties
    const counties = metrics
      .filter((m) => m.geography_type === 'county')
      .sort((a, b) => b.coverage_score - a.coverage_score)
      .slice(0, 10)

    // Get top 10 cities
    const cities = metrics
      .filter((m) => m.geography_type === 'city')
      .sort((a, b) => b.coverage_score - a.coverage_score)
      .slice(0, 10)

    // Calculate summary statistics
    const totalCountiesWithCoverage = metrics.filter((m) => m.geography_type === 'county').length
    const totalCitiesWithCoverage = metrics.filter((m) => m.geography_type === 'city').length

    // Get Tier 1 county coverage (high priority counties)
    let tier1Counties: Tier1CountyRow[] = []
    try {
      tier1Counties = await sql<Tier1CountyRow[]>`SELECT fips_code, county_name, state_code, priority_tier FROM county_data WHERE priority_tier = 1`
    } catch (tier1Error) {
      console.error('Error fetching tier 1 counties:', tier1Error)
    }

    const tier1Count = tier1Counties.length
    const tier1WithCoverage = tier1Counties.filter((county) =>
      metrics.some((m) => m.geography_id === county.fips_code && m.total_resources > 0)
    ).length

    const tier1CoveragePercent = tier1Count > 0 ? (tier1WithCoverage / tier1Count) * 100 : 0

    return NextResponse.json({
      summary: {
        last_updated: metrics[0]?.last_updated || new Date().toISOString(),
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
