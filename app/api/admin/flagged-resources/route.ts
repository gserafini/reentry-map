import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resourceSuggestions, verificationLogs } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/admin/flagged-resources
 * List flagged resource suggestions (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending'

    // Fetch flagged suggestions
    const suggestions = await db
      .select({
        id: resourceSuggestions.id,
        name: resourceSuggestions.name,
        address: resourceSuggestions.address,
        city: resourceSuggestions.city,
        state: resourceSuggestions.state,
        phone: resourceSuggestions.phone,
        website: resourceSuggestions.website,
        status: resourceSuggestions.status,
        adminNotes: resourceSuggestions.adminNotes,
        createdAt: resourceSuggestions.createdAt,
      })
      .from(resourceSuggestions)
      .where(eq(resourceSuggestions.status, status))
      .orderBy(desc(resourceSuggestions.createdAt))

    // For each suggestion, fetch latest verification log
    const suggestionsWithLogs = await Promise.all(
      suggestions.map(async (suggestion) => {
        const [log] = await db
          .select({
            overallScore: verificationLogs.overallScore,
            decisionReason: verificationLogs.decisionReason,
            checksPerformed: verificationLogs.checksPerformed,
            conflictsFound: verificationLogs.conflictsFound,
            createdAt: verificationLogs.createdAt,
          })
          .from(verificationLogs)
          .where(eq(verificationLogs.suggestionId, suggestion.id))
          .orderBy(desc(verificationLogs.createdAt))
          .limit(1)

        return {
          ...suggestion,
          admin_notes: suggestion.adminNotes,
          created_at: suggestion.createdAt,
          verification_log: log
            ? {
                overall_score: log.overallScore,
                decision_reason: log.decisionReason,
                checks_performed: log.checksPerformed,
                conflicts_found: log.conflictsFound,
                created_at: log.createdAt,
              }
            : null,
        }
      })
    )

    return NextResponse.json({ data: suggestionsWithLogs })
  } catch (error) {
    console.error('Error fetching flagged resources:', error)
    return NextResponse.json({ error: 'Failed to fetch flagged resources' }, { status: 500 })
  }
}
