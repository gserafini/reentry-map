import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'

/**
 * POST /api/admin/coverage/calculate
 *
 * Triggers recalculation of coverage metrics for specified geography
 * or all geographies if no parameters provided
 *
 * Body:
 * - geography_type?: 'national' | 'state' | 'county' | 'city' | 'all'
 * - geography_id?: string (e.g., 'CA', '06001', 'Oakland')
 *
 * Returns:
 * - success: boolean
 * - calculated: number (count of geographies recalculated)
 * - results: updated metrics
 *
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const auth = await checkAdminAuth(request)
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const body = (await request.json()) as { geography_type?: string; geography_id?: string }
    const { geography_type, geography_id } = body

    let calculated = 0

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

    const results: CoverageMetricRow[] = []

    if (geography_type === 'all' || (!geography_type && !geography_id)) {
      // Recalculate everything
      const data = await sql<CoverageMetricRow[]>`SELECT * FROM recalculate_all_coverage()`

      calculated = data.length
      results.push(...data)
    } else if (geography_type && geography_id) {
      // Recalculate specific geography
      await sql`SELECT * FROM calculate_coverage_metrics(${geography_type}, ${geography_id})`

      // Fetch the updated metric
      const metricRows = await sql<CoverageMetricRow[]>`
        SELECT * FROM coverage_metrics
        WHERE geography_type = ${geography_type}
          AND geography_id = ${geography_id}
        LIMIT 1
      `

      if (metricRows.length === 0) {
        throw new Error(`No metric found for ${geography_type}/${geography_id} after calculation`)
      }

      calculated = 1
      results.push(metricRows[0])
    } else if (geography_type) {
      // Recalculate all of one type
      let geographies: string[] = []

      if (geography_type === 'national') {
        geographies = ['US']
      } else if (geography_type === 'state') {
        const states = await sql<{ state: string }[]>`
          SELECT DISTINCT state FROM resources WHERE status = 'active'
        `
        geographies = states.map((s) => s.state)
      } else if (geography_type === 'county') {
        const counties = await sql<{ county_fips: string }[]>`
          SELECT DISTINCT county_fips FROM resources
          WHERE status = 'active' AND county_fips IS NOT NULL
        `
        geographies = counties.map((c) => c.county_fips)
      } else if (geography_type === 'city') {
        const cities = await sql<{ city: string }[]>`
          SELECT DISTINCT city FROM resources WHERE status = 'active'
        `
        geographies = cities.map((c) => c.city)
      }

      // Calculate each geography
      for (const geoId of geographies) {
        try {
          await sql`SELECT * FROM calculate_coverage_metrics(${geography_type}, ${geoId})`
          calculated++
        } catch (err) {
          console.error(`Error calculating ${geography_type}/${geoId}:`, err)
          continue
        }
      }

      // Fetch updated metrics
      const metrics = await sql<CoverageMetricRow[]>`
        SELECT * FROM coverage_metrics
        WHERE geography_type = ${geography_type}
        ORDER BY coverage_score DESC
      `

      results.push(...metrics)
    } else {
      return NextResponse.json({ error: 'Must provide geography_type or set to "all"' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      calculated,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error calculating coverage metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
