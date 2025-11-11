import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'

/**
 * GET /api/admin/verification-queue
 *
 * Returns resources flagged for verification with all context needed for Claude Web/Code
 * to perform manual verification. Optimized for AI agents browsing websites.
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via Supabase auth
 * - API key (Claude Code/scripts): Include header `x-admin-api-key: your-key`
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication (session or API key)
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const supabase = await createClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'pending'

    // Fetch flagged suggestions with latest verification log
    const { data: suggestions, error } = await supabase
      .from('resource_suggestions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    // For each suggestion, fetch latest verification log
    const queue = await Promise.all(
      (suggestions || []).map(async (suggestion) => {
        const { data: log } = await supabase
          .from('verification_logs')
          .select('overall_score, decision_reason, checks_performed, conflicts_found')
          .eq('suggestion_id', suggestion.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          id: suggestion.id,
          name: suggestion.name,
          address: suggestion.address,
          city: suggestion.city,
          state: suggestion.state,
          zip: suggestion.zip,
          phone: suggestion.phone,
          email: suggestion.email,
          website: suggestion.website,
          description: suggestion.description,
          primary_category: suggestion.primary_category,
          services_offered: suggestion.services_offered,
          hours: suggestion.hours,

          // Verification context
          verification_log: log || null,

          // Checks needed (based on automated verification failures)
          checks_needed: determineChecksNeeded(log),

          // Admin notes (why it was flagged)
          admin_notes: suggestion.admin_notes,

          // Submission context
          created_at: suggestion.created_at,
        }
      })
    )

    return NextResponse.json({
      queue,
      total: queue.length,
      instructions: {
        workflow:
          'For each resource: 1) Visit website 2) Verify claims 3) Check cross-references 4) POST decision',
        approve_endpoint: '/api/admin/flagged-resources/{id}/approve',
        reject_endpoint: '/api/admin/flagged-resources/{id}/reject',
      },
    })
  } catch (error) {
    console.error('Error fetching verification queue:', error)
    return NextResponse.json({ error: 'Failed to fetch verification queue' }, { status: 500 })
  }
}

/**
 * Determine which checks are needed based on verification log
 */
interface VerificationLog {
  checks_performed?: {
    url_reachable?: { pass: boolean }
    phone_valid?: { pass: boolean }
    address_geocodable?: { pass: boolean }
  }
}

function determineChecksNeeded(log: VerificationLog | null): string[] {
  if (!log?.checks_performed) {
    return ['website', 'phone', 'address', 'services', 'hours']
  }

  const checks: string[] = []

  // Check if website verification failed or missing
  if (!log.checks_performed.url_reachable?.pass) {
    checks.push('website')
  }

  // Check if phone verification failed or missing
  if (!log.checks_performed.phone_valid?.pass) {
    checks.push('phone')
  }

  // Check if address verification failed or missing
  if (!log.checks_performed.address_geocodable?.pass) {
    checks.push('address')
  }

  // Always verify services and hours (requires human judgment)
  checks.push('services', 'hours')

  return checks
}
