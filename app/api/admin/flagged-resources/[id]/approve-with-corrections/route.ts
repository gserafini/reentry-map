import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { env } from '@/lib/env'
import { db } from '@/lib/db/client'
import { resources, resourceSuggestions, verificationLogs } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { GoogleMapsGeocodingResponse } from '@/lib/types/google-maps'

/**
 * POST /api/admin/flagged-resources/[id]/approve-with-corrections
 * Approve a flagged resource with corrections applied
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via NextAuth
 * - API key (Claude Code/scripts): Include header `x-admin-api-key: your-key`
 *
 * Body:
 * {
 *   corrections: {
 *     name?: string,
 *     address?: string,
 *     city?: string,
 *     state?: string,
 *     zip?: string,
 *     phone?: string,
 *     website?: string,
 *     description?: string,
 *     // ... any other fields to correct
 *   },
 *   address_type?: 'physical' | 'confidential' | 'regional' | 'online' | 'mobile',
 *   service_area?: { type: string, values: string[] }, // For regional/online/mobile
 *   closure_status?: 'temporary' | 'permanent' | null,
 *   correction_notes: string // Required - explain what was fixed
 * }
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
    const body = (await request.json()) as {
      corrections?: Record<string, unknown>
      address_type?: 'physical' | 'confidential' | 'regional' | 'online' | 'mobile'
      service_area?: { type: string; values: string[] } | null
      closure_status?: 'temporary' | 'permanent' | null
      correction_notes: string
    }

    const {
      corrections = {},
      address_type = 'physical',
      service_area,
      closure_status,
      correction_notes,
    } = body

    // Validation: Require correction_notes with verification source
    if (!correction_notes) {
      return NextResponse.json(
        {
          error: 'correction_notes is required',
          details:
            'Must document verification source (URL or search query) and what was corrected. See docs/VERIFICATION_PROTOCOL.md',
        },
        { status: 400 }
      )
    }

    // Validation: Ensure verification source is documented (website URL or search query)
    // Check for common patterns: "Verified via", "http", "WebFetch", "WebSearch"
    const hasVerificationSource =
      correction_notes.toLowerCase().includes('verified via') ||
      correction_notes.toLowerCase().includes('http') ||
      correction_notes.toLowerCase().includes('webfetch') ||
      correction_notes.toLowerCase().includes('websearch') ||
      correction_notes.toLowerCase().includes('.org') ||
      correction_notes.toLowerCase().includes('.com')

    if (!hasVerificationSource) {
      return NextResponse.json(
        {
          error: 'correction_notes must include verification source',
          details:
            'Must document website URL or search query used. Example: "Verified via website (example.org)" or "Verified via WebSearch". See docs/VERIFICATION_PROTOCOL.md',
          provided_notes: correction_notes,
        },
        { status: 400 }
      )
    }

    // Fetch suggestion
    const [suggestion] = await db
      .select()
      .from(resourceSuggestions)
      .where(eq(resourceSuggestions.id, id))
      .limit(1)

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Merge corrections with original suggestion data
    const mergedData = {
      name: (corrections.name as string) || suggestion.name,
      description: (corrections.description as string) || suggestion.description,
      primaryCategory:
        (corrections.primary_category as string) ||
        suggestion.primaryCategory ||
        suggestion.category ||
        'general_support',
      categories: (corrections.categories as string[]) || suggestion.categories,
      tags: (corrections.tags as string[]) || suggestion.tags,
      address: (corrections.address as string) || suggestion.address,
      city: (corrections.city as string) || suggestion.city,
      state: (corrections.state as string) || suggestion.state,
      zip: (corrections.zip as string) || suggestion.zip,
      phone: (corrections.phone as string) || suggestion.phone,
      email: (corrections.email as string) || suggestion.email,
      website: (corrections.website as string) || suggestion.website,
      hours: corrections.hours || suggestion.hours,
      servicesOffered: (corrections.services_offered as string[]) || suggestion.servicesOffered,
      eligibilityRequirements:
        (corrections.eligibility_requirements as string) || suggestion.eligibilityRequirements,
      languages: (corrections.languages as string[]) || suggestion.languages,
      accessibilityFeatures:
        (corrections.accessibility_features as string[]) || suggestion.accessibilityFeatures,
    }

    // Handle coordinates based on address_type
    let latitude = (corrections.latitude as number) || suggestion.latitude
    let longitude = (corrections.longitude as number) || suggestion.longitude

    if (address_type === 'physical') {
      // Physical addresses require valid coordinates
      if (!latitude || !longitude) {
        if (!mergedData.address) {
          return NextResponse.json(
            { error: 'Cannot approve physical resource: missing address and coordinates' },
            { status: 400 }
          )
        }

        // Geocode the address
        const fullAddress = [mergedData.address, mergedData.city, mergedData.state, mergedData.zip]
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
              console.error('Geocoding failed:', geocodeData.status, geocodeData.error_message)
              return NextResponse.json(
                {
                  error: `Cannot geocode address "${fullAddress}"`,
                  geocode_status: geocodeData.status,
                },
                { status: 400 }
              )
            }
          } catch (error) {
            console.error('Geocoding error:', error)
            return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 500 })
          }
        } else {
          return NextResponse.json(
            { error: 'Geocoding not configured (GOOGLE_MAPS_KEY missing)' },
            { status: 500 }
          )
        }
      }
    } else if (address_type === 'confidential') {
      // Confidential addresses use city/county center coordinates
      // For now, use city-level geocoding (just city + state)
      if (!latitude || !longitude) {
        if (!mergedData.city || !mergedData.state) {
          return NextResponse.json(
            { error: 'Confidential resources require at least city and state' },
            { status: 400 }
          )
        }

        const cityAddress = `${mergedData.city}, ${mergedData.state}`

        if (env.GOOGLE_MAPS_KEY) {
          try {
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityAddress)}&key=${env.GOOGLE_MAPS_KEY}`
            const geocodeResponse = await fetch(geocodeUrl)
            const geocodeData = (await geocodeResponse.json()) as GoogleMapsGeocodingResponse

            if (geocodeData.status === 'OK' && geocodeData.results[0]) {
              latitude = geocodeData.results[0].geometry.location.lat
              longitude = geocodeData.results[0].geometry.location.lng
            } else {
              return NextResponse.json(
                {
                  error: `Cannot geocode city "${cityAddress}"`,
                  geocode_status: geocodeData.status,
                },
                { status: 400 }
              )
            }
          } catch (error) {
            console.error('City geocoding error:', error)
            return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 500 })
          }
        } else {
          return NextResponse.json(
            { error: 'Geocoding not configured (GOOGLE_MAPS_KEY missing)' },
            { status: 500 }
          )
        }
      }
    } else if (['regional', 'online', 'mobile'].includes(address_type)) {
      // These types don't need coordinates, but need service_area
      if (!service_area) {
        return NextResponse.json(
          { error: `${address_type} resources require service_area to be defined` },
          { status: 400 }
        )
      }
      // Coordinates are optional for these types
      latitude = null
      longitude = null
    }

    // Extract verification source from correction_notes for tracking
    // Look for URL patterns in correction_notes
    const urlMatch = correction_notes.match(/(https?:\/\/[^\s)]+)/i)
    const domainMatch = correction_notes.match(/\(([a-z0-9.-]+\.(org|com|net|gov))\)/i)
    const verificationSource = urlMatch
      ? urlMatch[1]
      : domainMatch
        ? `https://${domainMatch[1]}`
        : 'WebSearch'

    // Create resource from corrected data
    const [resource] = await db
      .insert(resources)
      .values({
        name: mergedData.name,
        description: mergedData.description,
        primaryCategory: mergedData.primaryCategory,
        categories: mergedData.categories,
        tags: mergedData.tags,
        address: mergedData.address || '',
        city: mergedData.city,
        state: mergedData.state,
        zip: mergedData.zip,
        latitude,
        longitude,
        phone: mergedData.phone,
        email: mergedData.email,
        website: mergedData.website,
        hours: mergedData.hours,
        servicesOffered: mergedData.servicesOffered,
        eligibilityRequirements: mergedData.eligibilityRequirements,
        languages: mergedData.languages,
        accessibilityFeatures: mergedData.accessibilityFeatures,
        addressType: address_type,
        serviceArea: service_area,
        closureStatus: closure_status,
        correctionNotes: correction_notes,
        verificationSource,
        lastVerifiedAt: new Date(),
        verifiedBy: auth.userId || null, // null for API key auth
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
        reviewNotes: `${auth.authMethod === 'api_key' ? 'Approved via API key (Claude Code)' : 'Approved via web'}\n\nCorrections applied:\n${correction_notes}`,
        correctionNotes: correction_notes,
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
          humanDecision: 'approved_with_corrections',
        })
        .where(eq(verificationLogs.id, latestLog.id))
    }

    return NextResponse.json({
      success: true,
      resource_id: resource.id,
      message: 'Resource approved with corrections and published',
      corrections_applied: correction_notes,
    })
  } catch (error) {
    console.error('Error approving resource with corrections:', error)
    return NextResponse.json({ error: 'Failed to approve resource' }, { status: 500 })
  }
}
