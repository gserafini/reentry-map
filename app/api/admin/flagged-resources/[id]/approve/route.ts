import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { env } from '@/lib/env'
import { db } from '@/lib/db/client'
import { resources, resourceSuggestions, verificationLogs } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { GoogleMapsGeocodingResponse } from '@/lib/types/google-maps'

/**
 * POST /api/admin/flagged-resources/[id]/approve
 * Approve a flagged resource suggestion and create resource (admin only)
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via NextAuth
 * - API key (Claude Code/scripts): Include header `x-admin-api-key: your-key`
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Fetch suggestion
    const [suggestion] = await db
      .select()
      .from(resourceSuggestions)
      .where(eq(resourceSuggestions.id, id))
      .limit(1)

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Geocode address if coordinates are missing
    let latitude = suggestion.latitude
    let longitude = suggestion.longitude

    if (!latitude || !longitude) {
      if (!suggestion.address) {
        return NextResponse.json(
          { error: 'Cannot approve resource: missing address and coordinates' },
          { status: 400 }
        )
      }

      // Build full address for geocoding
      const fullAddress = [suggestion.address, suggestion.city, suggestion.state, suggestion.zip]
        .filter(Boolean)
        .join(', ')

      // Geocode using Google Maps API
      if (env.GOOGLE_MAPS_KEY) {
        try {
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${env.GOOGLE_MAPS_KEY}`
          const geocodeResponse = await fetch(geocodeUrl)
          const geocodeData = (await geocodeResponse.json()) as GoogleMapsGeocodingResponse

          if (geocodeData.status === 'OK' && geocodeData.results[0]) {
            latitude = geocodeData.results[0].geometry.location.lat
            longitude = geocodeData.results[0].geometry.location.lng
          } else {
            console.error('Geocoding failed:', geocodeData.status, geocodeData.error_message)
            return NextResponse.json(
              {
                error: `Cannot approve resource: failed to geocode address "${fullAddress}"`,
                geocode_status: geocodeData.status,
              },
              { status: 400 }
            )
          }
        } catch (error) {
          console.error('Geocoding error:', error)
          return NextResponse.json(
            { error: 'Cannot approve resource: geocoding service unavailable' },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Cannot approve resource: geocoding not configured (GOOGLE_MAPS_KEY missing)' },
          { status: 500 }
        )
      }
    }

    // Create resource from suggestion (only using columns that exist in resources table)
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
        addressType: 'physical', // Standard approval assumes physical address
        status: 'active',
        verified: true,
        source: 'admin_approved',
        verificationStatus: 'verified',
      })
      .returning({ id: resources.id })

    if (!resource) {
      console.error('Failed to create resource')
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
    }

    // Mark suggestion as approved
    await db
      .update(resourceSuggestions)
      .set({
        status: 'approved',
        reviewedBy: auth.userId || null,
        reviewedAt: new Date(),
        reviewNotes:
          auth.authMethod === 'api_key' ? 'Approved via API key (Claude Code)' : undefined,
      })
      .where(eq(resourceSuggestions.id, id))

    // Update verification log to mark as human reviewed
    // First find the most recent log for this suggestion
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

    return NextResponse.json({
      success: true,
      resource_id: resource.id,
      message: 'Resource approved and published',
    })
  } catch (error) {
    console.error('Error approving resource:', error)
    return NextResponse.json({ error: 'Failed to approve resource' }, { status: 500 })
  }
}
