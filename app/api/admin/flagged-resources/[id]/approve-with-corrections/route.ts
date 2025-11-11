import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { env } from '@/lib/env'
import type { GoogleMapsGeocodingResponse } from '@/lib/types/google-maps'

/**
 * POST /api/admin/flagged-resources/[id]/approve-with-corrections
 * Approve a flagged resource with corrections applied
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via Supabase auth
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

    const supabase = auth.getClient()
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
    const { data: suggestion, error: fetchError } = await supabase
      .from('resource_suggestions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Merge corrections with original suggestion data
    const mergedData = {
      name: corrections.name || suggestion.name,
      description: corrections.description || suggestion.description,
      primary_category:
        corrections.primary_category ||
        suggestion.primary_category ||
        suggestion.category ||
        'general_support',
      categories: corrections.categories || suggestion.categories,
      tags: corrections.tags || suggestion.tags,
      address: corrections.address || suggestion.address,
      city: corrections.city || suggestion.city,
      state: corrections.state || suggestion.state,
      zip: corrections.zip || suggestion.zip,
      phone: corrections.phone || suggestion.phone,
      email: corrections.email || suggestion.email,
      website: corrections.website || suggestion.website,
      hours: corrections.hours || suggestion.hours,
      services_offered: corrections.services_offered || suggestion.services_offered,
      eligibility_requirements:
        corrections.eligibility_requirements || suggestion.eligibility_requirements,
      languages: corrections.languages || suggestion.languages,
      accessibility_features:
        corrections.accessibility_features || suggestion.accessibility_features,
    }

    // Handle coordinates based on address_type
    let latitude = corrections.latitude || suggestion.latitude
    let longitude = corrections.longitude || suggestion.longitude

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
    const { data: resource, error: createError } = await supabase
      .from('resources')
      .insert({
        name: mergedData.name,
        description: mergedData.description,
        primary_category: mergedData.primary_category,
        categories: mergedData.categories,
        tags: mergedData.tags,
        address: mergedData.address,
        city: mergedData.city,
        state: mergedData.state,
        zip: mergedData.zip,
        latitude,
        longitude,
        phone: mergedData.phone,
        email: mergedData.email,
        website: mergedData.website,
        hours: mergedData.hours,
        services_offered: mergedData.services_offered,
        eligibility_requirements: mergedData.eligibility_requirements,
        languages: mergedData.languages,
        accessibility_features: mergedData.accessibility_features,
        address_type,
        service_area,
        closure_status,
        correction_notes,
        verification_source: verificationSource,
        last_verified_at: new Date().toISOString(),
        verified_by: auth.userId || null, // null for API key auth
        status: 'active',
        verified: true,
        source: 'admin_approved',
        verification_status: 'verified',
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Failed to create resource:', createError)
      return NextResponse.json(
        { error: 'Failed to create resource', details: createError.message },
        { status: 500 }
      )
    }

    // Mark suggestion as approved
    await supabase
      .from('resource_suggestions')
      .update({
        status: 'approved',
        reviewed_by: auth.userId || null,
        reviewed_at: new Date().toISOString(),
        review_notes: `${auth.authMethod === 'api_key' ? 'Approved via API key (Claude Code)' : 'Approved via web'}\n\nCorrections applied:\n${correction_notes}`,
        correction_notes,
      })
      .eq('id', id)

    // Update verification log to mark as human reviewed
    await supabase
      .from('verification_logs')
      .update({
        human_reviewed: true,
        human_reviewer_id: auth.userId || null,
        human_decision: 'approved_with_corrections',
      })
      .eq('suggestion_id', id)
      .order('created_at', { ascending: false })
      .limit(1)

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
