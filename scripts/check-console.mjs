import { chromium } from 'playwright'

// Get path from command line args, default to /
const path = process.argv[2] || '/'
const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3003'
const url = `${baseUrl}${path}`

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

// Collect console logs
const logs = []
page.on('console', (msg) => {
  const text = msg.text()
  logs.push(`[${msg.type()}] ${text}`)
  console.log(`[${msg.type()}] ${text}`)
})

// Collect page errors
page.on('pageerror', (error) => {
  console.error('[PAGE ERROR]', error.message)
  logs.push(`[PAGE ERROR] ${error.message}`)
})

try {
  console.log(`🔍 Navigating to ${url}...`)
  await page.goto(url, { waitUntil: 'networkidle' })

  console.log('\n⏳ Waiting 5 seconds for map to initialize...')
  await page.waitForTimeout(5000)

  console.log('\n📊 All console logs collected:')
  console.log('='.repeat(80))
  logs.forEach((log) => console.log(log))
  console.log('='.repeat(80))
} catch (error) {
  console.error('❌ Error:', error.message)
} finally {
  await browser.close()
}
