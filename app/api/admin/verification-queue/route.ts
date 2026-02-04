import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resourceSuggestions, verificationLogs } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/admin/verification-queue
 *
 * Returns resources flagged for verification with all context needed for Claude Web/Code
 * to perform manual verification. Optimized for AI agents browsing websites.
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via NextAuth
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'pending'

    // Fetch flagged suggestions
    const suggestions = await db
      .select()
      .from(resourceSuggestions)
      .where(eq(resourceSuggestions.status, status))
      .orderBy(desc(resourceSuggestions.createdAt))
      .limit(limit)

    // For each suggestion, fetch latest verification log
    const queue = await Promise.all(
      suggestions.map(async (suggestion) => {
        const [log] = await db
          .select({
            overallScore: verificationLogs.overallScore,
            decisionReason: verificationLogs.decisionReason,
            checksPerformed: verificationLogs.checksPerformed,
            conflictsFound: verificationLogs.conflictsFound,
          })
          .from(verificationLogs)
          .where(eq(verificationLogs.suggestionId, suggestion.id))
          .orderBy(desc(verificationLogs.createdAt))
          .limit(1)

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
          primary_category: suggestion.primaryCategory,
          services_offered: suggestion.servicesOffered,
          hours: suggestion.hours,

          // Verification context
          verification_log: log
            ? {
                overall_score: log.overallScore,
                decision_reason: log.decisionReason,
                checks_performed: log.checksPerformed,
                conflicts_found: log.conflictsFound,
              }
            : null,

          // Checks needed (based on automated verification failures)
          checks_needed: determineChecksNeeded(
            log
              ? {
                  checks_performed: log.checksPerformed as VerificationLog['checks_performed'],
                }
              : null
          ),

          // Admin notes (why it was flagged)
          admin_notes: suggestion.adminNotes,

          // Submission context
          created_at: suggestion.createdAt,
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
