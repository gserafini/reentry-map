/**
 * Website screenshot utility for resource pages
 *
 * Captures screenshots of resource websites using Playwright and saves to local filesystem
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

/** Directory where screenshots are stored (served statically by Next.js) */
const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'screenshots')

export interface ScreenshotResult {
  url: string // Public URL path to screenshot
  capturedAt: Date
}

/**
 * Capture screenshot of a website and save to local filesystem
 *
 * @param websiteUrl - URL of website to screenshot
 * @param resourceId - Resource ID (used for filename)
 * @returns Public URL path to screenshot and capture timestamp
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

    // Ensure screenshots directory exists
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true })

    // Write screenshot to local filesystem
    const filename = `${resourceId}.jpg`
    const filepath = path.join(SCREENSHOTS_DIR, filename)
    await fs.writeFile(filepath, jpgBuffer)

    return {
      url: `/screenshots/${filename}`,
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
 * Delete screenshot from local filesystem
 *
 * @param resourceId - Resource ID
 */
export async function deleteWebsiteScreenshot(resourceId: string): Promise<boolean> {
  try {
    const filename = `${resourceId}.jpg`
    const filepath = path.join(SCREENSHOTS_DIR, filename)
    await fs.unlink(filepath)
    return true
  } catch (error) {
    // Ignore "file not found" errors (ENOENT)
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return true
    }
    console.error('Error deleting screenshot:', error)
    return false
  }
}
