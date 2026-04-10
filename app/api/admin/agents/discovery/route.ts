import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { getAISystemStatus } from '@/lib/api/settings'
import { DiscoveryAgent } from '@/lib/ai-agents'

/**
 * POST /api/admin/agents/discovery
 *
 * Trigger the Discovery Agent to find new resources.
 * Requires admin authentication AND ai_discovery_enabled in app_settings.
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

    // Check AI system settings
    const aiStatus = await getAISystemStatus()
    if (!aiStatus.isDiscoveryActive) {
      return NextResponse.json(
        {
          error: 'Discovery agent is disabled',
          detail: !aiStatus.masterEnabled
            ? 'AI master switch is off. Enable it in /admin/settings.'
            : 'Discovery agent is disabled in /admin/settings.',
        },
        { status: 403 }
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
