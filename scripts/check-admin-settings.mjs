#!/usr/bin/env node

import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

try {
  console.log('🌐 Navigating to http://localhost:3003/admin/settings...')
  await page.goto('http://localhost:3003/admin/settings', {
    waitUntil: 'networkidle',
    timeout: 30000,
  })

  console.log('\n📸 Taking screenshot...')
  await page.screenshot({
    path: '/tmp/admin-settings-check.png',
    fullPage: true,
  })

  console.log('\n📋 Page title:', await page.title())

  // Check for AI Systems Control section
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
  console.log('\n📝 Headings found:', headings.length)
  headings.forEach((h, i) => console.log(`  ${i + 1}. ${h}`))

  // Check for specific text
  const hasAIControl = await page.getByText('AI Systems Control', { exact: false }).count()
  console.log('\n🤖 "AI Systems Control" found:', hasAIControl > 0)

  const hasMasterSwitch = await page.getByText('Master AI Control', { exact: false }).count()
  console.log('🔧 "Master AI Control" found:', hasMasterSwitch > 0)

  // Get all visible text
  const bodyText = await page.locator('body').textContent()
  if (bodyText.includes('Sign in') || bodyText.includes('Unauthorized')) {
    console.log('\n⚠️  Authentication required!')
  }

  if (bodyText.includes('AI Systems Control')) {
    console.log('\n✅ AI Systems Control section IS on the page')
  } else {
    console.log('\n❌ AI Systems Control section NOT found on page')
    console.log('\n📄 Page content preview:')
    console.log(bodyText.substring(0, 500))
  }

  console.log('\n📸 Screenshot saved to: /tmp/admin-settings-check.png')
} catch (error) {
  console.error('❌ Error:', error.message)
} finally {
  await browser.close()
}
