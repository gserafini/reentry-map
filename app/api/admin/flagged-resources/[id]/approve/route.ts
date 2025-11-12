import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { env } from '@/lib/env'
import type { GoogleMapsGeocodingResponse } from '@/lib/types/google-maps'

/**
 * POST /api/admin/flagged-resources/[id]/approve
 * Approve a flagged resource suggestion and create resource (admin only)
 *
 * Authentication:
 * - Session-based (browser/Claude Web): Automatic via Supabase auth
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

    // Use the appropriate client (service role for API key, regular for session)
    const supabase = auth.getClient()
    const { id } = await params

    // Fetch suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from('resource_suggestions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !suggestion) {
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
    const { data: resource, error: createError } = await supabase
      .from('resources')
      .insert({
        name: suggestion.name,
        description: suggestion.description,
        primary_category: suggestion.primary_category || suggestion.category || 'general_support',
        categories: suggestion.categories,
        tags: suggestion.tags,
        address: suggestion.address,
        city: suggestion.city,
        state: suggestion.state,
        zip: suggestion.zip,
        latitude,
        longitude,
        phone: suggestion.phone,
        email: suggestion.email,
        website: suggestion.website,
        hours: suggestion.hours,
        services_offered: suggestion.services_offered,
        eligibility_requirements: suggestion.eligibility_requirements,
        languages: suggestion.languages,
        accessibility_features: suggestion.accessibility_features,
        address_type: 'physical', // Standard approval assumes physical address
        status: 'active',
        verified: true,
        source: 'admin_approved',
        verification_status: 'verified',
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Failed to create resource:', createError)
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
    }

    // Mark suggestion as approved
    await supabase
      .from('resource_suggestions')
      .update({
        status: 'approved',
        reviewed_by: auth.userId || null,
        reviewed_at: new Date().toISOString(),
        review_notes:
          auth.authMethod === 'api_key' ? 'Approved via API key (Claude Code)' : undefined,
      })
      .eq('id', id)

    // Update verification log to mark as human reviewed
    await supabase
      .from('verification_logs')
      .update({
        human_reviewed: true,
        human_reviewer_id: auth.userId || null,
        human_decision: 'approved',
      })
      .eq('suggestion_id', id)
      .order('created_at', { ascending: false })
      .limit(1)

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
