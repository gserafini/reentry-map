import { chromium } from '@playwright/test'

const BASE_URL = 'http://localhost:3004'

async function checkAdminConsole() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const logs = []
  const errors = []

  page.on('console', (msg) => {
    const type = msg.type()
    const text = msg.text()
    logs.push({ type, text })
    if (type === 'error' || type === 'warning') {
      errors.push({ type, text })
    }
  })

  page.on('pageerror', (error) => {
    errors.push({ type: 'pageerror', text: error.message })
  })

  try {
    console.log('🔐 Logging in as admin user (admin@example.com)...')

    // Navigate to login page directly
    await page.goto(`${BASE_URL}/auth/login`)
    await page.waitForLoadState('networkidle')

    // Fill in credentials
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'AdminUser123!')

    // Click login button
    await page.click('button[type="submit"]:has-text("Login")')

    // Wait for login to complete
    await page.waitForTimeout(3000)

    console.log('✅ Logged in successfully')
    console.log('📊 Navigating to /admin dashboard...')

    // Navigate to admin dashboard
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })

    // Wait for dashboard to load
    await page.waitForTimeout(5000)

    console.log('\n📋 Console Logs:')
    console.log('================================================================================')

    const filteredLogs = logs.filter(
      (log) =>
        !log.text.includes('React DevTools') &&
        !log.text.includes('[HMR]') &&
        !log.text.includes('LocationInput')
    )

    filteredLogs.forEach((log) => {
      console.log(`[${log.type}] ${log.text}`)
    })

    console.log('================================================================================')

    if (errors.length > 0) {
      console.log('\n❌ ERRORS/WARNINGS FOUND:')
      console.log(
        '================================================================================'
      )
      errors.forEach((err) => {
        console.log(`[${err.type}] ${err.text}`)
      })
      console.log(
        '================================================================================'
      )
      process.exit(1)
    } else {
      console.log('\n✅ No console errors or warnings!')
    }
  } catch (error) {
    console.error('❌ Error during check:', error.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

checkAdminConsole()
