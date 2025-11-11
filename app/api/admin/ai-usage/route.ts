import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/ai-usage
 * Get AI usage statistics and budget status (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch usage summary
    const { data: usage, error: usageError } = await supabase
      .from('ai_usage_summary')
      .select('*')
      .gte('date', startDate.toISOString())
      .order('date', { ascending: false })

    if (usageError) {
      throw usageError
    }

    // Fetch budget status
    const { data: budget, error: budgetError } = await supabase
      .from('ai_budget_status')
      .select('*')
      .order('month', { ascending: false })
      .limit(6) // Last 6 months

    if (budgetError) {
      throw budgetError
    }

    return NextResponse.json({
      usage: usage || [],
      budget: budget || [],
    })
  } catch (error) {
    console.error('Error fetching AI usage:', error)
    return NextResponse.json({ error: 'Failed to fetch AI usage' }, { status: 500 })
  }
}
