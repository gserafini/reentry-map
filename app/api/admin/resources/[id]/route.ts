import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { determineCounty } from '@/lib/utils/county'
import { captureWebsiteScreenshot } from '@/lib/utils/screenshot'

/**
 * GET /api/admin/resources/[id]
 * Get a single resource (admin only)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

    const { data, error } = await supabase.from('resources').select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching resource:', error)
    return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/resources/[id]
 * Update a resource (admin only)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await request.json()) as any

    // Automatically determine county (use provided county from geocoding or lookup from coordinates)
    let countyData = null
    if (body.county || body.latitude) {
      countyData = await determineCounty(
        body.county || null, // County name from geocoding
        body.state || 'CA',
        body.latitude || null,
        body.longitude || null
      )
    }

    // Update resource
    const { data, error } = await supabase
      .from('resources')
      .update({
        name: body.name,
        description: body.description || null,
        primary_category: body.primary_category,
        categories: body.categories || null,
        tags: body.tags || null,
        address: body.address,
        city: body.city || null,
        state: body.state || 'CA',
        zip: body.zip || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        county: countyData?.county || null,
        county_fips: countyData?.county_fips || null,
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
        hours: body.hours || null,
        services_offered: body.services_offered || null,
        eligibility_requirements: body.eligibility_requirements || null,
        required_documents: body.required_documents || null,
        fees: body.fees || null,
        languages: body.languages || null,
        accessibility_features: body.accessibility_features || null,
        status: body.status,
        verified: body.verified,
        // Geocoding metadata (from Google Maps Geocoding API)
        google_place_id: body.placeId || null,
        location_type: body.locationType || null,
        neighborhood: body.neighborhood || null,
        formatted_address: body.formattedAddress || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Capture screenshot on every update (asynchronous, non-blocking)
    // Part of verification process - always get fresh screenshot
    if (data.website) {
      captureWebsiteScreenshot(data.website, data.id)
        .then(async (screenshotResult) => {
          if (screenshotResult) {
            // Update resource with screenshot URL
            await supabase
              .from('resources')
              .update({
                screenshot_url: screenshotResult.url,
                screenshot_captured_at: screenshotResult.capturedAt.toISOString(),
              })
              .eq('id', data.id)
            console.log(`Screenshot updated for resource ${data.id}`)
          }
        })
        .catch((err) => {
          console.error(`Failed to update screenshot for resource ${data.id}:`, err)
        })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating resource:', error)
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/resources/[id]
 * Delete a resource (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    const { error } = await supabase.from('resources').delete().eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resource:', error)
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
  }
}
