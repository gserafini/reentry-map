import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { env } from '@/lib/env'
import { db } from '@/lib/db/client'
import { resources, resourceSuggestions, verificationLogs } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { GoogleMapsGeocodingResponse } from '@/lib/types/google-maps'

interface BatchResult {
  id: string
  status: 'approved' | 'rejected' | 'needs_attention' | 'failed'
  resource_id?: string
  error?: string
}

/**
 * POST /api/admin/flagged-resources/batch
 * Batch approve or reject multiple flagged resource suggestions.
 *
 * Body:
 * {
 *   action: "approve" | "reject",
 *   ids: string[],
 *   reason?: string  // Required for reject, optional for approve
 * }
 *
 * Authentication: API key or session
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

    const body = (await request.json()) as {
      action: 'approve' | 'reject'
      ids: string[]
      reason?: string
    }

    const { action, ids, reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject".' },
        { status: 400 }
      )
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }

    if (action === 'reject' && !reason) {
      return NextResponse.json({ error: 'reason is required for reject action' }, { status: 400 })
    }

    const results: BatchResult[] = []
    let processed = 0
    let failed = 0

    for (const id of ids) {
      try {
        if (action === 'approve') {
          const result = await approveSuggestion(id, auth)
          results.push(result)
          if (result.status === 'failed') {
            failed++
          } else {
            processed++
          }
        } else {
          const result = await rejectSuggestion(id, reason!, auth)
          results.push(result)
          if (result.status === 'failed') {
            failed++
          } else {
            processed++
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        results.push({ id, status: 'failed', error: errMsg })
        failed++
      }
    }

    return NextResponse.json({
      success: failed === 0,
      total: ids.length,
      processed,
      failed,
      results,
    })
  } catch (error) {
    console.error('Error processing batch:', error)
    return NextResponse.json({ error: 'Failed to process batch' }, { status: 500 })
  }
}

async function approveSuggestion(
  id: string,
  auth: { userId?: string | null; authMethod: string }
): Promise<BatchResult> {
  // Fetch suggestion
  const [suggestion] = await db
    .select()
    .from(resourceSuggestions)
    .where(eq(resourceSuggestions.id, id))
    .limit(1)

  if (!suggestion) {
    return { id, status: 'failed', error: 'Suggestion not found' }
  }

  // Geocode if coordinates missing
  let latitude = suggestion.latitude
  let longitude = suggestion.longitude

  if (!latitude || !longitude) {
    if (!suggestion.address) {
      return { id, status: 'failed', error: 'Missing address and coordinates' }
    }

    const fullAddress = [suggestion.address, suggestion.city, suggestion.state, suggestion.zip]
      .filter(Boolean)
      .join(', ')

    if (env.GOOGLE_MAPS_KEY) {
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${env.GOOGLE_MAPS_KEY}`
        const geocodeResponse = await fetch(geocodeUrl)
        const geocodeData = (await geocodeResponse.json()) as GoogleMapsGeocodingResponse

        if (geocodeData.status === 'OK' && geocodeData.results[0]) {
          latitude = geocodeData.results[0].geometry.location.lat
          longitude = geocodeData.results[0].geometry.location.lng
        } else {
          return { id, status: 'failed', error: `Geocoding failed: ${geocodeData.status}` }
        }
      } catch {
        return { id, status: 'failed', error: 'Geocoding service unavailable' }
      }
    } else {
      return { id, status: 'failed', error: 'GOOGLE_MAPS_KEY not configured' }
    }
  }

  // Create resource
  const [resource] = await db
    .insert(resources)
    .values({
      name: suggestion.name,
      description: suggestion.description,
      primaryCategory: suggestion.primaryCategory || suggestion.category || 'general_support',
      categories: suggestion.categories,
      tags: suggestion.tags,
      address: suggestion.address || '',
      city: suggestion.city,
      state: suggestion.state,
      zip: suggestion.zip,
      latitude,
      longitude,
      phone: suggestion.phone,
      email: suggestion.email,
      website: suggestion.website,
      hours: suggestion.hours,
      servicesOffered: suggestion.servicesOffered,
      eligibilityRequirements: suggestion.eligibilityRequirements,
      languages: suggestion.languages,
      accessibilityFeatures: suggestion.accessibilityFeatures,
      addressType: 'physical',
      status: 'active',
      verified: true,
      source: 'admin_approved',
      verificationStatus: 'verified',
    })
    .returning({ id: resources.id })

  if (!resource) {
    return { id, status: 'failed', error: 'Failed to create resource' }
  }

  // Mark suggestion as approved
  await db
    .update(resourceSuggestions)
    .set({
      status: 'approved',
      reviewedBy: auth.userId || null,
      reviewedAt: new Date(),
      reviewNotes:
        auth.authMethod === 'api_key' ? 'Approved via batch API (Claude Code)' : undefined,
    })
    .where(eq(resourceSuggestions.id, id))

  // Update verification log
  const [latestLog] = await db
    .select({ id: verificationLogs.id })
    .from(verificationLogs)
    .where(eq(verificationLogs.suggestionId, id))
    .orderBy(desc(verificationLogs.createdAt))
    .limit(1)

  if (latestLog) {
    await db
      .update(verificationLogs)
      .set({
        humanReviewed: true,
        humanReviewerId: auth.userId || null,
        humanDecision: 'approved',
      })
      .where(eq(verificationLogs.id, latestLog.id))
  }

  return { id, status: 'approved', resource_id: resource.id }
}

async function rejectSuggestion(
  id: string,
  reason: string,
  auth: { userId?: string | null; authMethod: string }
): Promise<BatchResult> {
  // Fetch suggestion
  const [suggestion] = await db
    .select({ id: resourceSuggestions.id })
    .from(resourceSuggestions)
    .where(eq(resourceSuggestions.id, id))
    .limit(1)

  if (!suggestion) {
    return { id, status: 'failed', error: 'Suggestion not found' }
  }

  // Determine rejection type
  const permanentReasons = [
    'duplicate',
    'wrong_service_type',
    'permanently_closed',
    'does_not_exist',
    'wrong_location',
    'spam',
    'insufficient_info',
  ]

  const status: 'rejected' | 'needs_attention' = permanentReasons.includes(reason)
    ? 'rejected'
    : 'needs_attention'

  const reviewNotes = [
    auth.authMethod === 'api_key'
      ? `${status === 'rejected' ? 'Rejected' : 'Flagged'} via batch API (Claude Code)`
      : `${status === 'rejected' ? 'Rejected' : 'Flagged'} by admin`,
    `Reason: ${reason}`,
  ].join('\n')

  await db
    .update(resourceSuggestions)
    .set({
      status,
      rejectionReason: reason,
      reviewedBy: auth.userId || null,
      reviewedAt: new Date(),
      reviewNotes,
    })
    .where(eq(resourceSuggestions.id, id))

  // Update verification log
  const [latestLog] = await db
    .select({ id: verificationLogs.id })
    .from(verificationLogs)
    .where(eq(verificationLogs.suggestionId, id))
    .orderBy(desc(verificationLogs.createdAt))
    .limit(1)

  if (latestLog) {
    await db
      .update(verificationLogs)
      .set({
        humanReviewed: true,
        humanReviewerId: auth.userId || null,
        humanDecision: status,
      })
      .where(eq(verificationLogs.id, latestLog.id))
  }

  return { id, status }
}
