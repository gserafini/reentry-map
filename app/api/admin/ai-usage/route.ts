import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { sql } from '@/lib/db/client'

interface UsageSummary {
  date: string
  total_requests: number
  total_tokens: number
  total_cost: number
  agent_type: string
}

interface BudgetStatus {
  month: string
  budget: number
  spent: number
  remaining: number
}

/**
 * GET /api/admin/ai-usage
 * Get AI usage statistics and budget status (admin only)
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch usage summary using raw SQL (for view)
    const usage = await sql<UsageSummary[]>`
      SELECT * FROM ai_usage_summary
      WHERE date >= ${startDate.toISOString()}
      ORDER BY date DESC
    `

    // Fetch budget status using raw SQL (for view)
    const budget = await sql<BudgetStatus[]>`
      SELECT * FROM ai_budget_status
      ORDER BY month DESC
      LIMIT 6
    `

    return NextResponse.json({
      usage: usage || [],
      budget: budget || [],
    })
  } catch (error) {
    console.error('Error fetching AI usage:', error)
    return NextResponse.json({ error: 'Failed to fetch AI usage' }, { status: 500 })
  }
}
