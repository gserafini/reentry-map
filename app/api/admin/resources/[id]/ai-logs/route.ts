import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkCurrentUserIsAdmin } from '@/lib/utils/admin'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/admin/resources/:id/ai-logs
 * Fetch AI agent logs for a specific resource
 * Admin-only endpoint
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    const isAdmin = await checkCurrentUserIsAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Fetch AI agent logs for this resource, ordered by most recent first
    const { data: logs, error } = await supabase
      .from('ai_agent_logs')
      .select('*')
      .eq('resource_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching AI agent logs:', error)
      return NextResponse.json({ error: 'Failed to fetch AI agent logs' }, { status: 500 })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Error in AI agent logs endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
