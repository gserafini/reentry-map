import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

test.describe('AI System Controls', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as admin before accessing admin pages
    await loginAsTestUser(page, 'admin')

    // Navigate to admin settings page
    await page.goto('/admin/settings')
    await page.waitForLoadState('load')
  })

  test('should display AI system control panel with all switches', async ({ page }) => {
    // Check for AI Systems Control section
    await expect(page.getByText('AI Systems Control', { exact: false })).toBeVisible()

    // Check for master switch
    await expect(page.getByText('Master AI Control', { exact: false })).toBeVisible()

    // Check for individual system cards
    await expect(page.getByText('Autonomous Verification', { exact: false })).toBeVisible()
    await expect(page.getByText('Resource Discovery', { exact: false })).toBeVisible()
    await expect(page.getByText('Data Enrichment', { exact: false })).toBeVisible()
    await expect(page.getByText('Real-time Monitoring', { exact: false })).toBeVisible()
  })

  test('should toggle master AI switch and update status', async ({ page }) => {
    // Find master AI switch (it should be off initially)
    const masterSwitch = page
      .locator('[role="switch"]')
      .filter({ has: page.locator('input[name="ai_master_enabled"]') })
      .first()

    // Verify initial state is disabled
    await expect(page.getByText('Disabled', { exact: true }).first()).toBeVisible()

    // Click master switch to enable
    await masterSwitch.click()

    // Wait for success message
    await expect(page.getByText('AI systems enabled successfully', { exact: false })).toBeVisible({
      timeout: 10000,
    })

    // Verify status changed to enabled
    await expect(page.getByText('Enabled', { exact: true }).first()).toBeVisible()

    // Toggle back off
    await masterSwitch.click()

    // Wait for success message
    await expect(page.getByText('AI systems disabled successfully', { exact: false })).toBeVisible({
      timeout: 10000,
    })
  })

  test('should show Command Center status indicator', async ({ page }) => {
    // Navigate to Command Center
    await page.goto('/admin/command-center')
    await page.waitForLoadState('load')

    // Check for AI status banner (should show disabled initially)
    await expect(page.getByText('AI Systems Disabled', { exact: false })).toBeVisible()

    // Check for warning about manual review
    await expect(
      page.getByText('All AI operations are currently inactive', {
        exact: false,
      })
    ).toBeVisible()

    // Check for settings link
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
  })

  test('should enable AI and verify Command Center status updates', async ({ page }) => {
    // Enable master AI switch
    const masterSwitch = page
      .locator('[role="switch"]')
      .filter({ has: page.locator('input[name="ai_master_enabled"]') })
      .first()

    await masterSwitch.click()

    // Wait for success
    await expect(page.getByText('AI systems enabled successfully', { exact: false })).toBeVisible({
      timeout: 10000,
    })

    // Enable verification system
    const verificationSwitch = page
      .locator('[role="switch"]')
      .filter({ has: page.locator('input[name="ai_verification_enabled"]') })
      .first()

    await verificationSwitch.click()

    // Wait for success
    await page.waitForTimeout(2000)

    // Navigate to Command Center
    await page.goto('/admin/command-center')
    await page.waitForLoadState('load')

    // Check for active status
    await expect(page.getByText('AI Systems Active', { exact: false })).toBeVisible()

    // Check for verification chip
    await expect(page.getByText('Verification: Auto-Approving', { exact: false })).toBeVisible()

    // Clean up - disable AI systems
    await page.goto('/admin/settings')
    await page.waitForLoadState('load')

    // Disable master switch
    const masterSwitchCleanup = page
      .locator('[role="switch"]')
      .filter({ has: page.locator('input[name="ai_master_enabled"]') })
      .first()

    await masterSwitchCleanup.click()
    await page.waitForTimeout(1000)
  })

  test('should show individual system switches disabled when master is off', async ({ page }) => {
    // Verify master is off
    await expect(page.getByText('Disabled', { exact: true }).first()).toBeVisible()

    // Check that individual switches show "Inactive" status
    const inactiveChips = page.getByText('Inactive', { exact: true })
    await expect(inactiveChips.first()).toBeVisible()
  })
})
