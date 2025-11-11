#!/usr/bin/env node
/**
 * Test Playwright-based URL verification
 */

import { chromium } from 'playwright'

const testUrls = [
  'https://lifelongmedical.org',
  'https://berkeleyca.gov/safety-health/mental-health',
  'https://www.actransit.org/clipper-start',
  'https://www.bachhealth.org/',
]

console.log('🧪 Testing Playwright-based URL verification\n')

for (const url of testUrls) {
  console.log(`Testing: ${url}`)

  const start = Date.now()
  let browser

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    })
    const page = await context.newPage()

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    })

    const status = response?.status() || 0
    const latency = Date.now() - start

    if (status >= 200 && status < 400) {
      console.log(`  ✅ PASS - Status: ${status} (${latency}ms)`)
    } else {
      console.log(`  ❌ FAIL - Status: ${status} (${latency}ms)`)
    }
  } catch (error) {
    const latency = Date.now() - start
    console.log(`  ❌ ERROR: ${error.message} (${latency}ms)`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }

  console.log('')
}
