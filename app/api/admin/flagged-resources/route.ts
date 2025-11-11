import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/flagged-resources
 * List flagged resource suggestions (admin only)
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
    const status = searchParams.get('status') || 'pending'

    // Fetch flagged suggestions with latest verification log
    const { data: suggestions, error } = await supabase
      .from('resource_suggestions')
      .select(
        `
        id,
        name,
        address,
        city,
        state,
        phone,
        website,
        status,
        admin_notes,
        created_at
      `
      )
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // For each suggestion, fetch latest verification log
    const suggestionsWithLogs = await Promise.all(
      (suggestions || []).map(async (suggestion) => {
        const { data: log } = await supabase
          .from('verification_logs')
          .select('overall_score, decision_reason, checks_performed, conflicts_found, created_at')
          .eq('suggestion_id', suggestion.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          ...suggestion,
          verification_log: log || null,
        }
      })
    )

    return NextResponse.json({ data: suggestionsWithLogs })
  } catch (error) {
    console.error('Error fetching flagged resources:', error)
    return NextResponse.json({ error: 'Failed to fetch flagged resources' }, { status: 500 })
  }
}
