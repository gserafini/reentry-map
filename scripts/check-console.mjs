import { chromium } from 'playwright'

const path = process.argv[2] || '/'
const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3003'
const url = `${baseUrl}${path}`

// Chromium without WebGL can legitimately use Google's raster renderer.
// Accept only the two observed complete messages (no suffix, or a space + period).
// Do not use a prefix match: other Maps and application errors must still fail.
const HEADLESS_MAPS_FALLBACK =
  'Attempted to load a Vector Map, but failed. Falling back to Raster. Please see https://developers.google.com/maps/documentation/javascript/webgl/support for more info'

const failures = new Set()
let browser
let responses = 0
let consoleMessages = 0

function requestLabel(value) {
  try {
    const parsed = new URL(value)
    return parsed.origin + parsed.pathname
  } catch {
    return '(invalid URL)'
  }
}
function fail(message) {
  if (!failures.has(message)) console.error(message)
  failures.add(message)
  process.exitCode = 1
}
function checkResponse(response) {
  if (!response) {
    fail('[HTTP ERROR] Navigation did not return an HTTP response.')
    return
  }
  if (response.status() >= 400) {
    fail(`[HTTP ERROR] ${response.status()} ${requestLabel(response.url())}`)
  }
}

try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  page.on('console', (message) => {
    consoleMessages += 1
    const text = message.text()
    if (text === HEADLESS_MAPS_FALLBACK || text === HEADLESS_MAPS_FALLBACK + ' .') {
      console.log('[KNOWN HEADLESS FALLBACK] Google Maps is using its raster renderer.')
    } else if (message.type() === 'error') {
      fail('[CONSOLE ERROR] ' + text)
    } else if (message.type() === 'warning') {
      console.log('[warning] ' + text)
    }
  })
  page.on('pageerror', (error) => fail('[PAGE ERROR] ' + error.message))
  page.on('response', (response) => {
    responses += 1
    checkResponse(response)
  })

  console.log('Checking browser console: ' + requestLabel(url))
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  checkResponse(response)
  await page.locator('body').waitFor({ state: 'visible', timeout: 10000 })
  // Maps keeps network connections active; a finite hydration observation is
  // appropriate here. Interactive journey verification is a separate release check.
  await page.waitForTimeout(2000)
} catch (error) {
  fail('[BROWSER CHECK ERROR] ' + (error instanceof Error ? error.message : String(error)))
} finally {
  if (browser) {
    try {
      await browser.close()
    } catch (error) {
      fail('[BROWSER CLEANUP ERROR] ' + (error instanceof Error ? error.message : String(error)))
    }
  }
}

if (failures.size) {
  console.error(
    `FAIL: ${failures.size} browser issue(s). Fix the reported errors, then rerun npm run console:check.`
  )
} else {
  console.log(
    `PASS: ${requestLabel(url)} — ${responses} responses, ${consoleMessages} console messages, no unexpected errors.`
  )
}
