#!/usr/bin/env node

/**
 * Check console logs on /profile page while authenticated
 */

import { chromium } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3003'

async function checkProfileAuthenticated() {
  console.log('🔍 Checking /profile page with authentication...\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const consoleMessages = []
  const errors = []

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
    // Navigate to sign-up page
    console.log('📝 Signing up test user...')
    await page.goto(`${BASE_URL}/auth/sign-up`)
    await page.waitForLoadState('networkidle')

    // Fill in email sign up form
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)

    // Click sign up button
    await page.click('button[type="submit"]:has-text("Sign Up")')

    // Wait for sign up to complete (may redirect or show success message)
    await page.waitForTimeout(3000)

    console.log(`✅ Test user created: ${testEmail}\n`)

    // Navigate to profile page
    console.log('🔍 Navigating to /profile...')
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('networkidle')

    // Wait a bit for any async operations
    console.log('⏳ Waiting for page to fully load...\n')
    await page.waitForTimeout(3000)

    // Check if we're still on the profile page or redirected
    const currentUrl = page.url()
    console.log(`📍 Current URL: ${currentUrl}\n`)

    if (currentUrl.includes('/profile')) {
      console.log('✅ Successfully on profile page\n')
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

    if (errors.length > 0) {
      console.log('\n❌ Errors detected:')
      errors.forEach((error) => console.log(`  - ${error}`))
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

checkProfileAuthenticated()
