import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'
import { getAllCategories } from '@/lib/utils/categories'

/**
 * GET /api/admin/coverage/city?city=Boulder&state=CO
 * Returns category coverage analysis for a specific city.
 * Shows resource counts per category, identifies gaps (0 resources)
 * and thin coverage (1-2 resources).
 *
 * Authentication: API key or session
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

    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const state = searchParams.get('state')

    if (!city || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters: city and state' },
        { status: 400 }
      )
    }

    const categoryCounts = await sql<{ category: string | null; count: number }[]>`
      WITH resource_categories AS (
        SELECT id, primary_category AS category
        FROM resources
        WHERE city ILIKE ${city}
          AND state = ${state}
          AND status = 'active'

        UNION ALL

        SELECT id, unnest(categories) AS category
        FROM resources
        WHERE city ILIKE ${city}
          AND state = ${state}
          AND status = 'active'
          AND categories IS NOT NULL
      )
      SELECT
        category,
        COUNT(DISTINCT id)::int AS count
      FROM resource_categories
      WHERE category IS NOT NULL
      GROUP BY category
    `

    const [totalResult] = await sql<{ value: number }[]>`
      SELECT COUNT(*)::int AS value
      FROM resources
      WHERE city ILIKE ${city}
        AND state = ${state}
        AND status = 'active'
    `

    const [ungeocodedResult] = await sql<{ value: number }[]>`
      SELECT COUNT(*)::int AS value
      FROM resources
      WHERE city ILIKE ${city}
        AND state = ${state}
        AND status = 'active'
        AND (latitude IS NULL OR longitude IS NULL)
    `

    // Build category map from query results
    const categoryMap: Record<string, number> = {}
    for (const row of categoryCounts) {
      if (row.category) {
        categoryMap[row.category] = row.count
      }
    }

    // Compare against all 13 categories
    const allCategories = getAllCategories()
    const categories: Record<string, number> = {}
    const gaps: string[] = []
    const thinCoverage: string[] = []

    for (const cat of allCategories) {
      const categoryCount = categoryMap[cat] || 0
      categories[cat] = categoryCount
      if (categoryCount === 0) {
        gaps.push(cat)
      } else if (categoryCount <= 2) {
        thinCoverage.push(cat)
      }
    }

    return NextResponse.json({
      city,
      state,
      total_resources: totalResult?.value || 0,
      ungeocoded: ungeocodedResult?.value || 0,
      categories,
      gaps,
      thin_coverage: thinCoverage,
      all_categories: allCategories,
    })
  } catch (error) {
    console.error('Error fetching city coverage:', error)
    return NextResponse.json({ error: 'Failed to fetch city coverage' }, { status: 500 })
  }
}
