import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { determineCounty } from '@/lib/utils/county'
import { captureWebsiteScreenshot } from '@/lib/utils/screenshot'

/**
 * GET /api/admin/resources
 * List all resources (admin only)
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters for filtering/pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase.from('resources').select('*', { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`)
    }

    // Apply pagination and sorting
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      throw error
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching resources:', error)
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
  }
}

/**
 * POST /api/admin/resources
 * Create a new resource (admin only)
 */
export async function POST(request: NextRequest) {
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

    // Insert resource
    const { data, error } = await supabase
      .from('resources')
      .insert({
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
        services: body.services || null,
        eligibility_requirements: body.eligibility_requirements || null,
        required_documents: body.required_documents || null,
        fees: body.fees || null,
        languages: body.languages || null,
        accessibility_features: body.accessibility_features || null,
        status: body.status || 'active',
        verified: body.verified || false,
        source: 'admin',
        // Geocoding metadata (from Google Maps Geocoding API)
        google_place_id: body.placeId || null,
        location_type: body.locationType || null,
        neighborhood: body.neighborhood || null,
        formatted_address: body.formattedAddress || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Capture website screenshot asynchronously (non-blocking)
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
            console.log(`Screenshot captured for resource ${data.id}`)
          }
        })
        .catch((err) => {
          console.error(`Failed to capture screenshot for resource ${data.id}:`, err)
        })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating resource:', error)
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
  }
}
