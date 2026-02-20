import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resources } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { determineCounty } from '@/lib/utils/county'
import { captureWebsiteScreenshot } from '@/lib/utils/screenshot'

/**
 * GET /api/admin/resources/[id]
 * Get a single resource (admin only)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const [data] = await db.select().from(resources).where(eq(resources.id, id)).limit(1)

    if (!data) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
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
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    const body = (await request.json()) as {
      name: string
      description?: string
      primary_category: string
      categories?: string[]
      tags?: string[]
      address: string
      city?: string
      state?: string
      zip?: string
      latitude?: number
      longitude?: number
      county?: string
      phone?: string
      email?: string
      website?: string
      hours?: Record<string, string>
      services_offered?: string[]
      eligibility_requirements?: string
      required_documents?: string[]
      fees?: string
      languages?: string[]
      accessibility_features?: string[]
      status?: string
      verified?: boolean
      placeId?: string
      locationType?: string
      neighborhood?: string
      formattedAddress?: string
    }

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
    const [data] = await db
      .update(resources)
      .set({
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
        servicesOffered: body.services_offered || null,
        eligibilityRequirements: body.eligibility_requirements || null,
        requiredDocuments: body.required_documents || null,
        fees: body.fees || null,
        languages: body.languages || null,
        accessibilityFeatures: body.accessibility_features || null,
        status: body.status,
        verified: body.verified,
        // Geocoding metadata (from Google Maps Geocoding API)
        googlePlaceId: body.placeId || null,
        locationType: body.locationType || null,
        neighborhood: body.neighborhood || null,
        formattedAddress: body.formattedAddress || null,
      })
      .where(eq(resources.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Capture screenshot on every update (asynchronous, non-blocking)
    // Part of verification process - always get fresh screenshot
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
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    await db.delete(resources).where(eq(resources.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resource:', error)
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
  }
}
