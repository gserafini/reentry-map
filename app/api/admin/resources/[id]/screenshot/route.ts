import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { db } from '@/lib/db/client'
import { resources } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { captureWebsiteScreenshot } from '@/lib/utils/screenshot'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/admin/resources/[id]/screenshot
 * Capture screenshot of resource website (admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const auth = await checkAdminAuth(request)

    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }

    // Fetch resource
    const [resource] = await db
      .select({
        id: resources.id,
        name: resources.name,
        website: resources.website,
      })
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1)

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    if (!resource.website) {
      return NextResponse.json({ error: 'Resource has no website' }, { status: 400 })
    }

    // Capture screenshot
    const screenshotResult = await captureWebsiteScreenshot(resource.website, resource.id)

    if (!screenshotResult) {
      return NextResponse.json({ error: 'Failed to capture screenshot' }, { status: 500 })
    }

    // Update resource with screenshot URL
    await db
      .update(resources)
      .set({
        screenshotUrl: screenshotResult.url,
        screenshotCapturedAt: screenshotResult.capturedAt,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))

    return NextResponse.json({
      success: true,
      screenshot_url: screenshotResult.url,
      captured_at: screenshotResult.capturedAt,
    })
  } catch (error) {
    console.error('Error capturing screenshot:', error)
    return NextResponse.json({ error: 'Failed to capture screenshot' }, { status: 500 })
  }
}
