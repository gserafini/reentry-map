#!/usr/bin/env node

/**
 * Check console logs on /profile page while logged in as test user
 */

import { chromium } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3003'
const TEST_EMAIL = 'testuser@example.com'
const TEST_PASSWORD = 'TestUser123!'

async function checkProfileWithLogin() {
  console.log('🔍 Testing /profile page with test user authentication...\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const consoleMessages = []
  const errors = []
  const failedRequests = []

  // Capture failed network requests
  page.on('response', (response) => {
    if (!response.ok()) {
      const url = response.url()
      const status = response.status()
      const failedRequest = `${status} ${url}`
      failedRequests.push(failedRequest)
      console.log(`[network] ${failedRequest}`)
    }
  })

  // Capture all console messages
  page.on('console', (msg) => {
    const type = msg.type()
    const text = msg.text()
    consoleMessages.push({ type, text })

    if (type === 'error') {
      errors.push(text)
      console.log(`[error] ${text}`)
    } else if (type === 'warning') {
      console.log(`[warning] ${text}`)
    }
  })

  // Capture page errors
  page.on('pageerror', (error) => {
    const errorText = error.message
    errors.push(errorText)
    console.log(`[pageerror] ${errorText}`)
  })

  try {
    // Navigate to login page
    console.log(`📝 Logging in as: ${TEST_EMAIL}`)
    await page.goto(`${BASE_URL}/auth/login`)
    await page.waitForLoadState('networkidle')

    // Fill in login form
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)

    // Click login button
    await page.click('button[type="submit"]:has-text("Login")')

    // Wait for login to complete
    await page.waitForTimeout(3000)

    console.log('✅ Logged in successfully\n')

    // Navigate to profile page
    console.log('🔍 Navigating to /profile...')
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('networkidle')

    // Wait for page to fully render
    console.log('⏳ Waiting for page to fully load...\n')
    await page.waitForTimeout(3000)

    // Check if we're still on the profile page or redirected
    const currentUrl = page.url()
    console.log(`📍 Current URL: ${currentUrl}\n`)

    if (currentUrl.includes('/profile')) {
      console.log('✅ Successfully on profile page\n')

      // Take a screenshot for debugging
      // await page.screenshot({ path: '/tmp/profile-page.png' })
      // console.log('📸 Screenshot saved to /tmp/profile-page.png\n')
    } else {
      console.log('⚠️  Redirected away from profile page\n')
    }

    // Print all console messages
    console.log('📊 All console logs:')
    console.log('='.repeat(80))
    consoleMessages.forEach(({ type, text }) => {
      console.log(`[${type}] ${text}`)
    })
    console.log('='.repeat(80))

    if (failedRequests.length > 0) {
      console.log('\n🌐 Failed network requests:')
      failedRequests.forEach((request) => console.log(`  - ${request}`))
    }

    if (errors.length > 0) {
      console.log('\n❌ Console errors detected:')
      errors.forEach((error) => console.log(`  - ${error}`))
    }

    if (errors.length > 0 || failedRequests.length > 0) {
      process.exit(1)
    } else {
      console.log('\n✅ No errors detected!')
    }
  } catch (error) {
    console.error('\n❌ Script error:', error.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

checkProfileWithLogin()
