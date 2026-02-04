import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { aiAgentLogs } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

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
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const { id } = await params

    // Fetch AI agent logs for this resource, ordered by most recent first
    const logs = await db
      .select()
      .from(aiAgentLogs)
      .where(eq(aiAgentLogs.resourceId, id))
      .orderBy(desc(aiAgentLogs.createdAt))

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Error in AI agent logs endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
