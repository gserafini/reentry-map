#!/usr/bin/env node

/**
 * Test what Playwright sees when checking a URL
 */

import { chromium } from 'playwright'

const url = 'https://www.ceoworks.org/locations/oakland-ca'

console.log(`Testing URL: ${url}\n`)

const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
  ],
})

const context = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  viewport: { width: 1920, height: 1080 },
  locale: 'en-US',
  timezoneId: 'America/Los_Angeles',
  extraHTTPHeaders: {
    'Accept-Language': 'en-US,en;q=0.9',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  },
})

const page = await context.newPage()

await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  })
})

const response = await page.goto(url, {
  waitUntil: 'domcontentloaded',
  timeout: 15000,
})

console.log(`HTTP Status: ${response?.status()}`)
console.log(`Final URL: ${page.url()}`)
console.log(`\nPage title: ${await page.title()}`)

// Check for 404 indicators in content
const bodyText = await page.textContent('body')
const has404 =
  bodyText?.toLowerCase().includes('404') || bodyText?.toLowerCase().includes('not found')

console.log(`\nPage contains "404" or "not found": ${has404}`)

if (has404) {
  console.log('\nFirst 500 characters of body:')
  console.log(bodyText?.substring(0, 500))
}

await browser.close()
