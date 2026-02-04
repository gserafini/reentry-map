import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resources } from '@/lib/db/schema'
import { eq, desc, ilike, or, sql, count } from 'drizzle-orm'
import { determineCounty } from '@/lib/utils/county'
import { captureWebsiteScreenshot } from '@/lib/utils/screenshot'

/**
 * GET /api/admin/resources
 * List all resources (admin only)
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

    // Get query parameters for filtering/pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const offset = (page - 1) * limit

    // Build where conditions
    const conditions = []
    if (status) {
      conditions.push(eq(resources.status, status))
    }
    if (search) {
      conditions.push(
        or(ilike(resources.name, `%${search}%`), ilike(resources.address, `%${search}%`))
      )
    }

    // Get total count
    const [countResult] = await db
      .select({ value: count() })
      .from(resources)
      .where(
        conditions.length > 0
          ? conditions.length === 1
            ? conditions[0]
            : sql`${conditions[0]} AND ${conditions[1]}`
          : undefined
      )

    const total = countResult?.value || 0

    // Get paginated data
    let query = db.select().from(resources)

    if (conditions.length > 0) {
      query = query.where(
        conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`
      ) as typeof query
    }

    const data = await query.orderBy(desc(resources.createdAt)).limit(limit).offset(offset)

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
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
    const [data] = await db
      .insert(resources)
      .values({
        name: body.name,
        description: body.description || null,
        primaryCategory: body.primary_category,
        categories: body.categories || null,
        tags: body.tags || null,
        address: body.address,
        city: body.city || null,
        state: body.state || 'CA',
        zip: body.zip || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        county: countyData?.county || null,
        countyFips: countyData?.county_fips || null,
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
        hours: body.hours || null,
        servicesOffered: body.services || null,
        eligibilityRequirements: body.eligibility_requirements || null,
        requiredDocuments: body.required_documents || null,
        fees: body.fees || null,
        languages: body.languages || null,
        accessibilityFeatures: body.accessibility_features || null,
        status: body.status || 'active',
        verified: body.verified || false,
        source: 'admin',
        // Geocoding metadata (from Google Maps Geocoding API)
        googlePlaceId: body.placeId || null,
        locationType: body.locationType || null,
        neighborhood: body.neighborhood || null,
        formattedAddress: body.formattedAddress || null,
      })
      .returning()

    if (!data) {
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
    }

    // Capture website screenshot asynchronously (non-blocking)
    if (data.website) {
      captureWebsiteScreenshot(data.website, data.id)
        .then(async (screenshotResult) => {
          if (screenshotResult) {
            // Update resource with screenshot URL
            await db
              .update(resources)
              .set({
                screenshotUrl: screenshotResult.url,
                screenshotCapturedAt: screenshotResult.capturedAt,
              })
              .where(eq(resources.id, data.id))
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
