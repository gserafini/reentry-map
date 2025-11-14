import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const maxDuration = 10 // Allow longer for health check

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
    const supabase = await createClient()
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get event counts by table (last 24 hours)
    const [
      pageViews,
      searches,
      resourceEvents,
      mapEvents,
      featureEvents,
      performanceEvents,
      sessions,
    ] = await Promise.all([
      supabase
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', yesterday.toISOString()),
      supabase
        .from('analytics_search_events')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', yesterday.toISOString()),
      supabase
        .from('analytics_resource_events')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', yesterday.toISOString()),
      supabase
        .from('analytics_map_events')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', yesterday.toISOString()),
      supabase
        .from('analytics_feature_events')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', yesterday.toISOString()),
      supabase
        .from('analytics_performance_events')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', yesterday.toISOString()),
      supabase
        .from('analytics_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', yesterday.toISOString()),
    ])

    // Get admin vs non-admin split
    const adminPageViews = await supabase
      .from('analytics_page_views')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true)
      .gte('timestamp', yesterday.toISOString())

    const totalEvents =
      (pageViews.count || 0) +
      (searches.count || 0) +
      (resourceEvents.count || 0) +
      (mapEvents.count || 0) +
      (featureEvents.count || 0) +
      (performanceEvents.count || 0)

    const adminEvents = adminPageViews.count || 0
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
    const sessionCount = sessions.count || 0
    const pageViewCount = pageViews.count || 0
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
        page_views: pageViews.count || 0,
        searches: searches.count || 0,
        resource_events: resourceEvents.count || 0,
        map_events: mapEvents.count || 0,
        feature_events: featureEvents.count || 0,
        performance_events: performanceEvents.count || 0,
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
        error_count: performanceEvents.count || 0,
        error_rate:
          totalEvents > 0 ? (((performanceEvents.count || 0) / totalEvents) * 100).toFixed(2) : '0',
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
