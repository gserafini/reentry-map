import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'

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

    // Check admin authentication
    const auth = await checkAdminAuth(request)
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Row types for query results
    interface CountyRow {
      fips_code: string
      state_fips: string
      county_name: string
      state_name: string
      state_code: string
      total_population: number | null
      estimated_annual_releases: number | null
      priority_tier: number | null
      priority_reason: string | null
      center_lat: number | null
      center_lng: number | null
    }

    interface CoverageMetricRow {
      id: string
      geography_type: string
      geography_id: string
      geography_name: string
      coverage_score: number
      resource_count_score: number
      category_coverage_score: number
      population_coverage_score: number
      verification_score: number
      total_resources: number
      verified_resources: number
      categories_covered: number
      unique_resources: number
      total_population: number | null
      reentry_population: number | null
      resources_in_211: number
      comprehensiveness_ratio: number
      avg_completeness_score: number | null
      avg_verification_score: number | null
      resources_with_reviews: number
      review_coverage_pct: number
      calculated_at: string
      last_updated: string
    }

    interface ResourceRow {
      id: string
      name: string
      primary_category: string
      city: string
      is_unique: boolean
      completeness_score: number | null
      verification_score: number | null
      review_count: number
    }

    interface CountyRankRow {
      geography_id: string
      coverage_score: number
    }

    // Get county reference data
    const countyRows = await sql<CountyRow[]>`
      SELECT * FROM county_data WHERE fips_code = ${fips} LIMIT 1
    `

    if (countyRows.length === 0) {
      return NextResponse.json({ error: 'County not found' }, { status: 404 })
    }

    const county = countyRows[0]

    // Get coverage metrics for this county
    const metricsRows = await sql<CoverageMetricRow[]>`
      SELECT * FROM coverage_metrics
      WHERE geography_type = 'county' AND geography_id = ${fips}
      LIMIT 1
    `
    const metrics = metricsRows[0] || null

    // Get resources in this county
    const resources = await sql<ResourceRow[]>`
      SELECT id, name, primary_category, city, is_unique, completeness_score, verification_score, review_count
      FROM resources
      WHERE county_fips = ${fips} AND status = 'active'
      ORDER BY name
    `

    // Group resources by category
    const categoryCounts: Record<string, number> = {}
    resources.forEach((r) => {
      categoryCounts[r.primary_category] = (categoryCounts[r.primary_category] || 0) + 1
    })

    // Get state-level comparison
    const stateMetricsRows = await sql<CoverageMetricRow[]>`
      SELECT * FROM coverage_metrics
      WHERE geography_type = 'state' AND geography_id = ${county.state_code}
      LIMIT 1
    `
    const stateMetrics = stateMetricsRows[0] || null

    // Get national comparison
    const nationalMetricsRows = await sql<CoverageMetricRow[]>`
      SELECT * FROM coverage_metrics
      WHERE geography_type = 'national' AND geography_id = 'US'
      LIMIT 1
    `
    const nationalMetrics = nationalMetricsRows[0] || null

    // Calculate county rank within state
    const stateCounties = await sql<CountyRankRow[]>`
      SELECT geography_id, coverage_score
      FROM coverage_metrics
      WHERE geography_type = 'county' AND geography_id LIKE ${county.state_fips + '%'}
      ORDER BY coverage_score DESC
    `

    const countyRank = stateCounties.findIndex((c) => c.geography_id === fips) + 1 || null
    const totalCountiesInState = stateCounties.length

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
        total: resources.length,
        by_category: categoryCounts,
        unique_count: resources.filter((r) => r.is_unique).length,
        with_reviews: resources.filter((r) => r.review_count > 0).length,
        list: resources,
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
