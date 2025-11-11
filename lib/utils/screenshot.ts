/**
 * Website screenshot utility for resource pages
 *
 * Captures screenshots of resource websites using Playwright and uploads to Supabase Storage
 */

import { chromium } from 'playwright'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { env } from '@/lib/env'

export interface ScreenshotResult {
  url: string // Public URL to screenshot in Supabase Storage
  capturedAt: Date
}

/**
 * Capture screenshot of a website and upload to Supabase Storage
 *
 * @param websiteUrl - URL of website to screenshot
 * @param resourceId - Resource ID (used for storage filename)
 * @returns Public URL to screenshot and capture timestamp
 */
export async function captureWebsiteScreenshot(
  websiteUrl: string,
  resourceId: string
): Promise<ScreenshotResult | null> {
  let browser = null

  try {
    // Validate URL
    const url = new URL(websiteUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.error('Invalid URL protocol:', url.protocol)
      return null
    }

    // Launch headless browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })

    const page = await context.newPage()

    // Set timeout and navigate
    await page.goto(websiteUrl, {
      waitUntil: 'networkidle',
      timeout: 30000, // 30 second timeout
    })

    // Wait a bit for dynamic content
    await page.waitForTimeout(2000)

    // Capture screenshot as PNG buffer
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false, // Viewport only
    })

    // Convert PNG to JPG using sharp (smaller file size)
    const jpgBuffer = await sharp(screenshotBuffer)
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer()

    // Upload to Supabase Storage using service role key (bypasses RLS)
    const supabase = createSupabaseClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
    const filename = `${resourceId}.jpg`

    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from('resource-screenshots')
      .upload(filename, jpgBuffer, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      console.error('Error uploading screenshot:', uploadError)
      return null
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('resource-screenshots').getPublicUrl(filename)

    return {
      url: publicUrl,
      capturedAt: new Date(),
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error)
    return null
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Delete screenshot from Supabase Storage
 *
 * @param resourceId - Resource ID
 */
export async function deleteWebsiteScreenshot(resourceId: string): Promise<boolean> {
  try {
    // Use service role key to bypass RLS
    const supabase = createSupabaseClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
    const filename = `${resourceId}.jpg`

    const { error } = await supabase.storage.from('resource-screenshots').remove([filename])

    if (error) {
      console.error('Error deleting screenshot:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting screenshot:', error)
    return false
  }
}
