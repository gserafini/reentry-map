import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resources } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * PATCH /api/admin/resources/[id]/update
 * Update/re-verify an existing resource (admin only)
 *
 * Used for re-verification sweeps to update contact info, hours, services
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via NextAuth
 * - API key (Claude Code/scripts): Include header `x-admin-api-key: your-key`
 *
 * Body:
 * {
 *   updates: {
 *     email?: string,
 *     phone?: string,
 *     hours?: object,
 *     services_offered?: string[],
 *     // ... any resource field
 *   },
 *   verification_source: string,  // REQUIRED: Website URL or search query used
 *   verification_notes: string     // REQUIRED: What was verified/updated
 * }
 *
 * Validation:
 * - verification_source is required (prevents unverified updates)
 * - verification_notes is required (documents what changed)
 * - At least one field must be updated
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const { id } = await params
    const body = (await request.json()) as {
      updates?: Record<string, unknown>
      verification_source: string
      verification_notes?: string
    }
    const { updates = {}, verification_source, verification_notes } = body

    // Validation: Require verification evidence
    if (!verification_source) {
      return NextResponse.json(
        {
          error: 'verification_source is required',
          details:
            'Must include website URL or search query used to verify data. See docs/VERIFICATION_PROTOCOL.md',
        },
        { status: 400 }
      )
    }

    if (!verification_notes) {
      return NextResponse.json(
        {
          error: 'verification_notes is required',
          details:
            'Must document what was verified and what changed. See docs/VERIFICATION_PROTOCOL.md',
        },
        { status: 400 }
      )
    }

    // Validate at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided', details: 'updates object must contain at least one field' },
        { status: 400 }
      )
    }

    // Fetch current resource
    const [resource] = await db.select().from(resources).where(eq(resources.id, id)).limit(1)

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Build update object with tracking fields
    const updateData = {
      ...updates,
      verificationSource: verification_source,
      lastVerifiedAt: new Date(),
      verifiedBy: auth.userId || 'api_key',
    }

    // Update resource
    await db.update(resources).set(updateData).where(eq(resources.id, id))

    // Log the verification notes (could add to audit log table in future)

    return NextResponse.json({
      success: true,
      resource_id: id,
      verification_source,
      updated_fields: Object.keys(updates),
      message: 'Resource updated and verified',
    })
  } catch (error) {
    console.error('Error updating resource:', error)
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
  }
}
