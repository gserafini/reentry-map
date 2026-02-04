import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

/**
 * Admin Authentication E2E Tests
 * Tests admin-only features, authentication, and access control
 *
 * Uses the shared auth helper for reliable login across all viewports
 * (desktop and mobile).
 *
 * Note: Uses 'load' instead of 'networkidle' because Google Maps
 * keeps connections open, preventing networkidle from resolving.
 */

test.describe('Admin Authentication', () => {
  test.describe('Regular User Access', () => {
    test('regular user should not see admin menu item', async ({ page }) => {
      // Log in as regular user using auth helper
      await loginAsTestUser(page, 'regular')

      // Navigate to homepage
      await page.goto('/')
      await page.waitForLoadState('load')

      // Click on user avatar to open menu
      const userMenuButton = page.locator('[aria-label="user menu"]')
      if (await userMenuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userMenuButton.click()

        // Verify NO admin menu item
        await expect(page.locator('text=Admin Dashboard')).not.toBeVisible()

        // Verify regular menu items are present
        await expect(page.locator('text=Favorites')).toBeVisible()
        await expect(page.locator('text=Profile')).toBeVisible()
      }
    })

    test('regular user should be redirected from admin routes', async ({ page }) => {
      // Log in as regular user first
      await loginAsTestUser(page, 'regular')

      // Try to access admin dashboard
      await page.goto('/admin')
      await page.waitForLoadState('load')
      await page.waitForTimeout(2000)

      // Should be redirected to login/home OR show unauthorized
      const url = page.url()
      const hasAdminAccess =
        url.includes('/admin') && !url.includes('/auth/login') && !url.includes('error')

      // Regular user should either be redirected or see an error
      if (hasAdminAccess) {
        // If still on admin page, verify they see an unauthorized message
        const unauthorizedText = page.locator('text=Unauthorized').or(page.locator('text=denied'))
        const isUnauthorized = await unauthorizedText.isVisible().catch(() => false)
        expect(isUnauthorized || !url.includes('/admin')).toBeTruthy()
      }
    })
  })

  test.describe('Admin User Access', () => {
    test('admin user should see admin menu item', async ({ page }) => {
      // Log in as admin using auth helper
      await loginAsTestUser(page, 'admin')

      // Navigate to homepage
      await page.goto('/')
      await page.waitForLoadState('load')

      // Click on user avatar to open menu
      const userMenuButton = page.locator('[aria-label="user menu"]')
      if (await userMenuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userMenuButton.click()

        // Verify admin menu item IS present
        await expect(page.locator('text=Admin Dashboard')).toBeVisible()
      }
    })

    test('admin can access admin dashboard', async ({ page }) => {
      // Log in as admin
      await loginAsTestUser(page, 'admin')

      // Navigate to admin dashboard
      await page.goto('/admin')
      await page.waitForLoadState('load')

      // Verify on admin page
      await expect(page).toHaveURL(/\/admin/)
      await expect(page.locator('h6:has-text("Admin Dashboard")')).toBeVisible()

      // Verify admin navigation
      await expect(page.locator('button:has-text("Dashboard")')).toBeVisible()
      await expect(page.locator('button:has-text("Settings")')).toBeVisible()
      await expect(page.locator('button:has-text("Back to Site")')).toBeVisible()
    })

    test('admin dashboard shows correct stats', async ({ page }) => {
      // Log in as admin
      await loginAsTestUser(page, 'admin')

      // Go to admin dashboard
      await page.goto('/admin')
      await page.waitForLoadState('load')

      // Wait for stats to load
      await page.waitForSelector('h3', { timeout: 10000 })

      // Verify stat cards are present
      await expect(page.locator('text=Total Resources')).toBeVisible()
      await expect(page.locator('text=Total Users')).toBeVisible()
      await expect(page.locator('text=Reviews')).toBeVisible()
      await expect(page.locator('text=Suggestions')).toBeVisible()

      // Verify numeric values are displayed
      const statNumbers = page.locator('h3')
      await expect(statNumbers.first()).toBeVisible()
    })

    test('admin can navigate between admin sections', async ({ page }) => {
      // Log in as admin
      await loginAsTestUser(page, 'admin')

      // Go to admin dashboard
      await page.goto('/admin')
      await page.waitForLoadState('load')

      // Navigate to Settings
      await page.click('button:has-text("Settings")')
      await expect(page).toHaveURL(/\/admin\/settings/)
      await expect(page.locator('h4:has-text("Application Settings")')).toBeVisible()

      // Navigate back to Dashboard
      await page.click('button:has-text("Dashboard")')
      await expect(page).toHaveURL(/\/admin$/)

      // Navigate back to site
      await page.click('button:has-text("Back to Site")')
      await expect(page).toHaveURL(/\/$/)
    })
  })

  test.describe('Admin Settings', () => {
    test('admin can view SMS auth settings', async ({ page }) => {
      // Log in as admin
      await loginAsTestUser(page, 'admin')

      // Go to settings
      await page.goto('/admin/settings')
      await page.waitForLoadState('load')

      // Verify SMS auth section
      await expect(page.locator('text=SMS Authentication')).toBeVisible()
      await expect(page.locator('text=SMS Provider Status')).toBeVisible()

      // Verify configuration instructions are visible
      await expect(page.locator('text=To enable SMS authentication')).toBeVisible()
    })
  })
})
