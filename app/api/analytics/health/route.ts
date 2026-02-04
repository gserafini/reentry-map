import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/client'

export const maxDuration = 10 // Allow longer for health check

interface CountResult {
  count: number
}

/**
 * Analytics Health Check Endpoint
 * GET /api/analytics/health
 *
 * Returns analytics system health metrics:
 * - Total events in last 24 hours
 * - Event breakdown by type
 * - Admin event percentage (should be <10% in production)
 * - Recent activity status
 *
 * Used for monitoring and alerting in production.
 */
export async function GET() {
  try {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayIso = yesterday.toISOString()

    // Get event counts by table (last 24 hours) using raw SQL
    const [pageViews] = await sql<CountResult[]>`
      SELECT COUNT(*)::int as count FROM analytics_page_views
      WHERE timestamp >= ${yesterdayIso}::timestamptz
    `
    const [searches] = await sql<CountResult[]>`
      SELECT COUNT(*)::int as count FROM analytics_search_events
      WHERE timestamp >= ${yesterdayIso}::timestamptz
    `
    const [resourceEvents] = await sql<CountResult[]>`
      SELECT COUNT(*)::int as count FROM analytics_resource_events
      WHERE timestamp >= ${yesterdayIso}::timestamptz
    `
    const [mapEvents] = await sql<CountResult[]>`
      SELECT COUNT(*)::int as count FROM analytics_map_events
      WHERE timestamp >= ${yesterdayIso}::timestamptz
    `
    const [featureEvents] = await sql<CountResult[]>`
      SELECT COUNT(*)::int as count FROM analytics_feature_events
      WHERE timestamp >= ${yesterdayIso}::timestamptz
    `
    const [performanceEvents] = await sql<CountResult[]>`
      SELECT COUNT(*)::int as count FROM analytics_performance_events
      WHERE timestamp >= ${yesterdayIso}::timestamptz
    `
    const [sessions] = await sql<CountResult[]>`
      SELECT COUNT(*)::int as count FROM analytics_sessions
      WHERE started_at >= ${yesterdayIso}::timestamptz
    `

    // Get admin vs non-admin split
    const [adminPageViews] = await sql<CountResult[]>`
      SELECT COUNT(*)::int as count FROM analytics_page_views
      WHERE is_admin = true AND timestamp >= ${yesterdayIso}::timestamptz
    `

    const pageViewCount = pageViews?.count || 0
    const searchCount = searches?.count || 0
    const resourceEventCount = resourceEvents?.count || 0
    const mapEventCount = mapEvents?.count || 0
    const featureEventCount = featureEvents?.count || 0
    const performanceEventCount = performanceEvents?.count || 0
    const sessionCount = sessions?.count || 0

    const totalEvents =
      pageViewCount +
      searchCount +
      resourceEventCount +
      mapEventCount +
      featureEventCount +
      performanceEventCount

    const adminEvents = adminPageViews?.count || 0
    const adminPercentage = totalEvents > 0 ? (adminEvents / totalEvents) * 100 : 0

    // Determine health status
    let status: 'healthy' | 'warning' | 'error' = 'healthy'
    const warnings: string[] = []

    // Warning: No events in last 24 hours (might indicate tracking is broken)
    if (totalEvents === 0) {
      status = 'warning'
      warnings.push('No events recorded in last 24 hours')
    }

    // Warning: Admin events >50% (indicates mostly testing, not real users)
    if (adminPercentage > 50 && totalEvents > 10) {
      status = 'warning'
      warnings.push(
        `Admin events are ${adminPercentage.toFixed(1)}% of total (should be <10% in production)`
      )
    }

    // Warning: Very low session count relative to page views
    if (sessionCount > 0 && pageViewCount > 0) {
      const pagesPerSession = pageViewCount / sessionCount
      if (pagesPerSession > 100) {
        status = 'warning'
        warnings.push(
          `Unusually high pages per session (${pagesPerSession.toFixed(1)}), may indicate session tracking issue`
        )
      }
    }

    return NextResponse.json({
      status,
      timestamp: now.toISOString(),
      period: '24h',
      warnings: warnings.length > 0 ? warnings : undefined,
      summary: {
        total_events: totalEvents,
        total_sessions: sessionCount,
        pages_per_session: sessionCount > 0 ? (pageViewCount / sessionCount).toFixed(1) : '0',
      },
      events_by_type: {
        page_views: pageViewCount,
        searches: searchCount,
        resource_events: resourceEventCount,
        map_events: mapEventCount,
        feature_events: featureEventCount,
        performance_events: performanceEventCount,
      },
      admin_filtering: {
        admin_events: adminEvents,
        total_events: totalEvents,
        admin_percentage: adminPercentage.toFixed(1) + '%',
        status:
          adminPercentage > 50
            ? 'warning: high admin activity'
            : adminPercentage > 10
              ? 'normal: some admin activity'
              : 'good: mostly real users',
      },
      performance: {
        error_count: performanceEventCount,
        error_rate:
          totalEvents > 0 ? ((performanceEventCount / totalEvents) * 100).toFixed(2) : '0',
      },
    })
  } catch (error) {
    console.error('Analytics health check error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve analytics health metrics',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
