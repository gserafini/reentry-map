import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resources } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'

/**
 * GET /api/admin/statistics/summary
 * Returns comprehensive resource statistics in a single call.
 * Replaces N+1 queries for total counts by region and category.
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

    // Total active resources
    const [totalResult] = await db
      .select({ value: count() })
      .from(resources)
      .where(eq(resources.status, 'active'))

    // By state
    const stateRows = await db
      .select({
        state: resources.state,
        count: count(),
      })
      .from(resources)
      .where(eq(resources.status, 'active'))
      .groupBy(resources.state)

    const byState: Record<string, number> = {}
    for (const row of stateRows) {
      if (row.state) {
        byState[row.state] = row.count
      }
    }

    // By city (city, state)
    const cityRows = await db
      .select({
        city: resources.city,
        state: resources.state,
        count: count(),
      })
      .from(resources)
      .where(eq(resources.status, 'active'))
      .groupBy(resources.city, resources.state)

    const byCity: Record<string, number> = {}
    for (const row of cityRows) {
      if (row.city && row.state) {
        byCity[`${row.city}, ${row.state}`] = row.count
      }
    }

    // By category
    const categoryRows = await db
      .select({
        category: resources.primaryCategory,
        count: count(),
      })
      .from(resources)
      .where(eq(resources.status, 'active'))
      .groupBy(resources.primaryCategory)

    const byCategory: Record<string, number> = {}
    for (const row of categoryRows) {
      if (row.category) {
        byCategory[row.category] = row.count
      }
    }

    // By city and category (the most detailed breakdown)
    const cityCategoryRows = await db
      .select({
        city: resources.city,
        state: resources.state,
        category: resources.primaryCategory,
        count: count(),
      })
      .from(resources)
      .where(eq(resources.status, 'active'))
      .groupBy(resources.city, resources.state, resources.primaryCategory)

    const byCityAndCategory: Record<string, Record<string, number>> = {}
    for (const row of cityCategoryRows) {
      if (row.city && row.state && row.category) {
        const key = `${row.city}, ${row.state}`
        if (!byCityAndCategory[key]) {
          byCityAndCategory[key] = {}
        }
        byCityAndCategory[key][row.category] = row.count
      }
    }

    // Resources missing geocoding
    const [ungeocodedResult] = await db
      .select({ value: count() })
      .from(resources)
      .where(
        sql`${resources.status} = 'active' AND (${resources.latitude} IS NULL OR ${resources.longitude} IS NULL)`
      )

    return NextResponse.json({
      total_active: totalResult?.value || 0,
      ungeocoded: ungeocodedResult?.value || 0,
      by_state: byState,
      by_city: byCity,
      by_category: byCategory,
      by_city_and_category: byCityAndCategory,
    })
  } catch (error) {
    console.error('Error fetching summary statistics:', error)
    return NextResponse.json({ error: 'Failed to fetch summary statistics' }, { status: 500 })
  }
}
