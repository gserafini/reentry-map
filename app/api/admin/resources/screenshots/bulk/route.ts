import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resources } from '@/lib/db/schema'
import { isNull, isNotNull, count, eq } from 'drizzle-orm'
import { captureWebsiteScreenshot } from '@/lib/utils/screenshot'

/**
 * POST /api/admin/resources/screenshots/bulk
 * Capture screenshots for all resources with websites (admin only)
 *
 * Supports pagination to process in batches
 * Query parameters:
 *   - limit: number of resources to process per batch (default: 10)
 *   - offset: starting offset for pagination (default: 0)
 *   - force: if true, recapture all screenshots; if false, skip resources with existing screenshots (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    // Admin authentication (supports both session and API key via x-admin-api-key)
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const force = searchParams.get('force') === 'true'

    // Fetch total count first
    const countConditions = [isNotNull(resources.website)]
    if (!force) {
      countConditions.push(isNull(resources.screenshotUrl))
    }

    const [totalResult] = await db
      .select({ value: count() })
      .from(resources)
      .where(
        force
          ? isNotNull(resources.website)
          : isNotNull(resources.website) && isNull(resources.screenshotUrl)
      )

    const totalCount = totalResult?.value || 0

    // Fetch resources with websites
    const fetchedResources = await db
      .select({
        id: resources.id,
        name: resources.name,
        website: resources.website,
        screenshotUrl: resources.screenshotUrl,
      })
      .from(resources)
      .where(
        force
          ? isNotNull(resources.website)
          : isNotNull(resources.website) && isNull(resources.screenshotUrl)
      )
      .orderBy(resources.name)
      .limit(limit)
      .offset(offset)

    const results = []
    const errors = []

    // Process each resource
    for (const resource of fetchedResources || []) {
      try {
        console.log(`Capturing screenshot for: ${resource.name}`)

        const screenshotResult = await captureWebsiteScreenshot(resource.website!, resource.id)

        if (screenshotResult) {
          // Update resource with screenshot
          await db
            .update(resources)
            .set({
              screenshotUrl: screenshotResult.url,
              screenshotCapturedAt: screenshotResult.capturedAt,
              updatedAt: new Date(),
            })
            .where(eq(resources.id, resource.id))

          results.push({
            id: resource.id,
            name: resource.name,
            success: true,
            screenshot_url: screenshotResult.url,
          })
        } else {
          errors.push({
            id: resource.id,
            name: resource.name,
            error: 'Failed to capture screenshot',
          })
        }
      } catch (error) {
        console.error(`Error processing ${resource.name}:`, error)
        errors.push({
          id: resource.id,
          name: resource.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length + errors.length,
      successful: results.length,
      failed: errors.length,
      total: totalCount,
      results,
      errors,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < totalCount,
        nextOffset: offset + limit,
      },
    })
  } catch (error) {
    console.error('Error in bulk screenshot capture:', error)
    return NextResponse.json({ error: 'Failed to process bulk screenshots' }, { status: 500 })
  }
}
