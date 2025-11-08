import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VerificationAgent } from '@/lib/ai-agents'

/**
 * POST /api/admin/agents/verification
 *
 * Trigger the Verification Agent to verify existing resources
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

    // Run verification agent
    const agent = new VerificationAgent()
    await agent.run()

    return NextResponse.json({
      success: true,
      message: 'Verification agent completed successfully',
    })
  } catch (error) {
    console.error('Verification agent error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run verification agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
