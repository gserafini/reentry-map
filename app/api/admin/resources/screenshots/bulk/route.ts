import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()

    // Check for service role key (for scripts) or user authentication
    const authHeader = request.headers.get('authorization')
    const apiKey = request.headers.get('apikey')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const isServiceRole =
      (authHeader &&
        serviceRoleKey &&
        authHeader.replace('Bearer ', '').trim() === serviceRoleKey) ||
      (apiKey && serviceRoleKey && apiKey.trim() === serviceRoleKey)

    if (!isServiceRole) {
      // Regular user authentication
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
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const force = searchParams.get('force') === 'true'

    // Fetch resources with websites
    let query = supabase
      .from('resources')
      .select('id, name, website, screenshot_url', { count: 'exact' })
      .not('website', 'is', null)
      .order('name')

    // If not forcing, only fetch resources without screenshots
    if (!force) {
      query = query.is('screenshot_url', null)
    }

    const {
      data: resources,
      error: fetchError,
      count,
    } = await query.range(offset, offset + limit - 1)

    if (fetchError) {
      console.error('Error fetching resources:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
    }

    const results = []
    const errors = []

    // Process each resource
    for (const resource of resources || []) {
      try {
        console.log(`Capturing screenshot for: ${resource.name}`)

        const screenshotResult = await captureWebsiteScreenshot(resource.website!, resource.id)

        if (screenshotResult) {
          // Update resource with screenshot
          await supabase
            .from('resources')
            .update({
              screenshot_url: screenshotResult.url,
              screenshot_captured_at: screenshotResult.capturedAt.toISOString(),
            })
            .eq('id', resource.id)

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
      total: count || 0,
      results,
      errors,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
        nextOffset: offset + limit,
      },
    })
  } catch (error) {
    console.error('Error in bulk screenshot capture:', error)
    return NextResponse.json({ error: 'Failed to process bulk screenshots' }, { status: 500 })
  }
}
