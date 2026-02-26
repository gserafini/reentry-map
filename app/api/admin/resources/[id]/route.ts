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

    const body = (await request.json()) as Record<string, unknown>

    // Build partial update — only include fields that were sent in the request
    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      primary_category: 'primaryCategory',
      categories: 'categories',
      tags: 'tags',
      address: 'address',
      city: 'city',
      state: 'state',
      zip: 'zip',
      latitude: 'latitude',
      longitude: 'longitude',
      phone: 'phone',
      email: 'email',
      website: 'website',
      hours: 'hours',
      services_offered: 'servicesOffered',
      eligibility_requirements: 'eligibilityRequirements',
      required_documents: 'requiredDocuments',
      fees: 'fees',
      languages: 'languages',
      accessibility_features: 'accessibilityFeatures',
      status: 'status',
      verified: 'verified',
      placeId: 'googlePlaceId',
      locationType: 'locationType',
      neighborhood: 'neighborhood',
      formattedAddress: 'formattedAddress',
    }

    const updateData: Record<string, unknown> = {}
    for (const [bodyKey, dbKey] of Object.entries(fieldMap)) {
      if (bodyKey in body) {
        updateData[dbKey] = body[bodyKey] ?? null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Automatically determine county when location fields change
    if ('county' in body || 'latitude' in body) {
      // Fetch existing resource for fallback state
      const [existing] = await db.select().from(resources).where(eq(resources.id, id)).limit(1)
      const state = (body.state as string) || existing?.state || 'CO'
      const countyData = await determineCounty(
        (body.county as string) || null,
        state,
        (body.latitude as number) || null,
        (body.longitude as number) || null
      )
      if (countyData) {
        updateData.county = countyData.county
        updateData.countyFips = countyData.county_fips
      }
    }

    // Update resource (partial merge — only provided fields are changed)
    const [data] = await db
      .update(resources)
      .set(updateData)
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
