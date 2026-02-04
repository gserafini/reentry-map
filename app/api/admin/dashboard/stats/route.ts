import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'
import { getAISystemStatus } from '@/lib/api/settings'

interface ResourceCounts {
  total: number
  active: number
}

interface SuggestionCounts {
  pending: number
  recent_pending: number
}

interface UpdateCounts {
  pending: number
}

interface UrgentCounts {
  urgent: number
}

interface CostSummary {
  monthly_cost: number
  weekly_cost: number
  daily_cost: number
}

interface CostBreakdownRow {
  operation: string
  cost: number
  count: number
}

interface ActiveSessionCounts {
  active: number
}

interface FlaggedCounts {
  count: number
}

interface AgentLogRow {
  id: string
  agent_type: string
  action: string
  success: boolean | null
  cost: number | null
  error_message: string | null
  created_at: string
  duration_ms: number | null
}

interface RecentResourceRow {
  id: string
  name: string
  created_at: string
  updated_at: string
}

interface RecentSuggestionRow {
  id: string
  name: string
  status: string
  created_at: string
}

interface RecentUpdateRow {
  id: string
  resource_id: string
  status: string
  created_at: string
}

interface AgentSessionRow {
  id: string
  agent_type: string
  started_at: string
  ended_at: string | null
}

interface VerificationEventRow {
  id: string
  suggestion_id: string
  event_type: string
  event_data: Record<string, unknown>
  created_at: string
}

interface PendingSuggestionRow {
  id: string
  name: string
  city: string
  state: string
  status: string
  created_at: string
  primary_category: string
}

interface ActiveAgentSessionRow {
  id: string
  agent_type: string
  agent_id: string
  started_at: string
  last_activity_at: string
  resources_processed: number
  approvals: number
  rejections: number
  current_task_id: string | null
}

/**
 * GET /api/admin/dashboard/stats
 * Returns aggregated dashboard statistics for admin CommandCenter components.
 *
 * Query params:
 *   - section: comma-separated list of sections to fetch (default: all)
 *     Possible values: resources, suggestions, costs, logs, flagged, activity, sessions, verification
 *   - timeRange: time range for activity feed ('1h' | '6h' | '24h', default: '24h')
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
    const sectionsParam = searchParams.get('section')
    const timeRange = searchParams.get('timeRange') || '24h'

    // Determine which sections to fetch
    const allSections = [
      'resources',
      'suggestions',
      'costs',
      'logs',
      'flagged',
      'activity',
      'sessions',
      'verification',
      'pendingSuggestions',
      'activeAgentSessions',
      'aiSystemStatus',
    ]
    const requestedSections = sectionsParam
      ? sectionsParam.split(',').map((s) => s.trim())
      : allSections

    const shouldFetch = (section: string) => requestedSections.includes(section)

    // Build parallel queries based on requested sections
    // Each section is wrapped in error handling so one failure doesn't crash the entire response
    const results: Record<string, unknown> = {}

    const safeQuery = async (fn: () => Promise<void>): Promise<void> => {
      try {
        await fn()
      } catch (error) {
        // Log but don't throw — allows other sections to still return data
        console.warn('Dashboard stats section query failed:', error)
      }
    }

    const queries: Promise<void>[] = []

    // Resource counts
    if (shouldFetch('resources')) {
      queries.push(
        safeQuery(async () => {
          const rows = await sql<ResourceCounts[]>`
            SELECT
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE status = 'active')::int as active
            FROM resources
          `
          results.resources = rows[0] || { total: 0, active: 0 }
        })
      )
    }

    // Suggestion counts
    if (shouldFetch('suggestions')) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      queries.push(
        safeQuery(async () => {
          const rows = await sql<SuggestionCounts[]>`
            SELECT
              COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
              COUNT(*) FILTER (WHERE status = 'pending' AND created_at >= ${oneDayAgo})::int as recent_pending
            FROM resource_suggestions
          `
          results.suggestions = rows[0] || { pending: 0, recent_pending: 0 }
        })
      )
      queries.push(
        safeQuery(async () => {
          const rows = await sql<UpdateCounts[]>`
            SELECT COUNT(*) FILTER (WHERE status = 'pending')::int as pending
            FROM resource_updates
          `
          results.updates = rows[0] || { pending: 0 }
        })
      )
      queries.push(
        safeQuery(async () => {
          const rows = await sql<UrgentCounts[]>`
            SELECT COUNT(*)::int as urgent
            FROM resource_suggestions
            WHERE status = 'pending' AND created_at < ${threeDaysAgo}
          `
          results.urgent = rows[0] || { urgent: 0 }
        })
      )
    }

    // Cost data (uses ai_agent_logs table with 'cost' column)
    if (shouldFetch('costs')) {
      queries.push(
        safeQuery(async () => {
          const rows = await sql<CostSummary[]>`
            SELECT
              COALESCE(SUM(cost) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0)::float as monthly_cost,
              COALESCE(SUM(cost) FILTER (WHERE created_at >= NOW() - interval '7 days'), 0)::float as weekly_cost,
              COALESCE(SUM(cost) FILTER (WHERE created_at >= NOW() - interval '1 day'), 0)::float as daily_cost
            FROM ai_agent_logs
          `
          results.costs = rows[0] || { monthly_cost: 0, weekly_cost: 0, daily_cost: 0 }
        })
      )
      queries.push(
        safeQuery(async () => {
          const rows = await sql<CostBreakdownRow[]>`
            SELECT
              COALESCE(action, 'other') as operation,
              COALESCE(SUM(cost), 0)::float as cost,
              COUNT(*)::int as count
            FROM ai_agent_logs
            WHERE created_at >= date_trunc('month', NOW())
            GROUP BY COALESCE(action, 'other')
            ORDER BY cost DESC
          `
          results.costBreakdown = rows || []
        })
      )
    }

    // Recent agent logs (uses actual ai_agent_logs columns)
    if (shouldFetch('logs')) {
      queries.push(
        safeQuery(async () => {
          const rows = await sql<AgentLogRow[]>`
            SELECT id, agent_type, action, success, cost,
                   error_message, created_at, duration_ms
            FROM ai_agent_logs
            ORDER BY created_at DESC
            LIMIT 20
          `
          results.recentLogs = rows || []
        })
      )
    }

    // Flagged resource count (uses human_review_required column)
    if (shouldFetch('flagged')) {
      queries.push(
        safeQuery(async () => {
          const rows = await sql<FlaggedCounts[]>`
            SELECT COUNT(*)::int as count
            FROM resources
            WHERE human_review_required = true
          `
          results.flaggedCount = rows[0]?.count || 0
        })
      )
    }

    // Active agent sessions (agent_sessions table may not exist yet)
    if (shouldFetch('sessions')) {
      queries.push(
        safeQuery(async () => {
          const rows = await sql<ActiveSessionCounts[]>`
            SELECT COUNT(*)::int as active
            FROM agent_sessions
            WHERE ended_at IS NULL
          `
          results.activeSessions = rows[0]?.active || 0
        })
      )
    }

    // Activity feed
    if (shouldFetch('activity')) {
      const timeRangeMs: Record<string, number> = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
      }
      const cutoffTime = new Date(
        Date.now() - (timeRangeMs[timeRange] || timeRangeMs['24h'])
      ).toISOString()

      // Query existing tables; agent_sessions may not exist
      queries.push(
        safeQuery(async () => {
          const [resources, suggestions, updates] = await Promise.all([
            sql<RecentResourceRow[]>`
              SELECT id, name, created_at, updated_at
              FROM resources
              WHERE created_at >= ${cutoffTime}
              ORDER BY created_at DESC
              LIMIT 10
            `,
            sql<RecentSuggestionRow[]>`
              SELECT id, name, status, created_at
              FROM resource_suggestions
              WHERE created_at >= ${cutoffTime}
              ORDER BY created_at DESC
              LIMIT 10
            `,
            sql<RecentUpdateRow[]>`
              SELECT id, resource_id, status, created_at
              FROM resource_updates
              WHERE created_at >= ${cutoffTime}
              ORDER BY created_at DESC
              LIMIT 10
            `,
          ])
          // agent_sessions table may not exist — query separately
          let agentSessions: AgentSessionRow[] = []
          try {
            agentSessions = await sql<AgentSessionRow[]>`
              SELECT id, agent_type, started_at, ended_at
              FROM agent_sessions
              WHERE started_at >= ${cutoffTime}
              ORDER BY started_at DESC
              LIMIT 10
            `
          } catch {
            // agent_sessions table doesn't exist yet
          }
          results.activity = {
            resources: resources || [],
            suggestions: suggestions || [],
            updates: updates || [],
            sessions: agentSessions,
          }
        })
      )
    }

    // Verification events (verification_events table may not exist — use verification_logs)
    if (shouldFetch('verification')) {
      queries.push(
        safeQuery(async () => {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
          const rows = await sql<VerificationEventRow[]>`
            SELECT id, resource_id as suggestion_id, verification_type as event_type,
                   COALESCE(details, '{}'::jsonb) as event_data, created_at
            FROM verification_logs
            WHERE created_at >= ${oneHourAgo}
            ORDER BY created_at ASC
          `
          results.verificationEvents = rows || []
        })
      )
    }

    // Pending suggestions (full records for command center)
    if (shouldFetch('pendingSuggestions')) {
      queries.push(
        safeQuery(async () => {
          const rows = await sql<PendingSuggestionRow[]>`
            SELECT id, name, city, state, status, created_at, primary_category
            FROM resource_suggestions
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT 50
          `
          results.pendingSuggestions = rows || []
        })
      )
    }

    // Active agent sessions (full details — table may not exist)
    if (shouldFetch('activeAgentSessions')) {
      queries.push(
        safeQuery(async () => {
          const rows = await sql<ActiveAgentSessionRow[]>`
            SELECT id, agent_type, agent_id, started_at, last_activity_at,
                   resources_processed, approvals, rejections, current_task_id
            FROM agent_sessions
            WHERE ended_at IS NULL
            ORDER BY last_activity_at DESC
          `
          results.activeAgentSessions = rows || []
        })
      )
    }

    // AI system status (app_settings table may not exist)
    if (shouldFetch('aiSystemStatus')) {
      queries.push(
        safeQuery(async () => {
          const status = await getAISystemStatus()
          results.aiSystemStatus = status
        })
      )
    }

    // Execute all queries in parallel — each wrapped in error handling
    await Promise.all(queries)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
