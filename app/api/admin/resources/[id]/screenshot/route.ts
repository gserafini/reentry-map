import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureWebsiteScreenshot } from '@/lib/utils/screenshot'

/**
 * POST /api/admin/resources/[id]/screenshot
 * Capture screenshot of resource website (admin only)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Fetch resource
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('id, name, website')
      .eq('id', id)
      .single()

    if (fetchError || !resource) {
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
    const { error: updateError } = await supabase
      .from('resources')
      .update({
        screenshot_url: screenshotResult.url,
        screenshot_captured_at: screenshotResult.capturedAt.toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating resource with screenshot:', updateError)
      return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
    }

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
