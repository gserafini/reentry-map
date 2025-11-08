import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EnrichmentAgent } from '@/lib/ai-agents'

/**
 * POST /api/admin/agents/enrichment
 *
 * Trigger the Enrichment Agent to enrich existing resources
 * Requires admin authentication
 */
export async function POST(_request: NextRequest) {
  try {
    // Check authentication
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
