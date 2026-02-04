import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { EnrichmentAgent } from '@/lib/ai-agents'

/**
 * POST /api/admin/agents/enrichment
 *
 * Trigger the Enrichment Agent to enrich existing resources
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Run enrichment agent
    const agent = new EnrichmentAgent()
    await agent.run()

    return NextResponse.json({
      success: true,
      message: 'Enrichment agent completed successfully',
    })
  } catch (error) {
    console.error('Enrichment agent error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run enrichment agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
