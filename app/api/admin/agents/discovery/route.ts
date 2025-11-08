import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DiscoveryAgent } from '@/lib/ai-agents'

/**
 * POST /api/admin/agents/discovery
 *
 * Trigger the Discovery Agent to find new resources
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient()
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
