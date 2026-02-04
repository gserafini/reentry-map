import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { DiscoveryAgent } from '@/lib/ai-agents'

/**
 * POST /api/admin/agents/discovery
 *
 * Trigger the Discovery Agent to find new resources
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

    // Run discovery agent
    const agent = new DiscoveryAgent()
    await agent.run()

    return NextResponse.json({
      success: true,
      message: 'Discovery agent completed successfully',
    })
  } catch (error) {
    console.error('Discovery agent error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run discovery agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
