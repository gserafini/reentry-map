import { test, expect } from '@playwright/test'

/**
 * Admin Authentication E2E Tests
 * Tests admin-only features, authentication, and access control
 */

test.describe('Admin Authentication', () => {
  test.describe('Regular User Access', () => {
    test('regular user should not see admin menu item', async ({ page }) => {
      // Visit homepage
      await page.goto('/')

      // Log in as regular user
      await page.click('text=Log In')
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.fill('input[type="password"]', 'testpassword123')
      await page.click('button:has-text("Sign In")')

      // Wait for login to complete
      await page.waitForTimeout(2000)

      // Click on user avatar to open menu
      await page.click('[role="button"]:has(svg)')

      // Verify NO admin menu item
      await expect(page.locator('text=Admin Dashboard')).not.toBeVisible()

      // Verify regular menu items are present
      await expect(page.locator('text=Favorites')).toBeVisible()
      await expect(page.locator('text=Profile')).toBeVisible()
    })

    test('regular user should be redirected from admin routes', async ({ page }) => {
      // Try to access admin dashboard directly
      await page.goto('/admin')

      // Should be redirected to login or home
      await page.waitForURL(/\/(auth\/login|$)/)

      // Verify NOT on admin page
      await expect(page).not.toHaveURL(/\/admin/)
    })
  })

  test.describe('Admin User Access', () => {
    test('admin user should see admin menu item', async ({ page }) => {
      // Visit homepage
      await page.goto('/')

      // Log in as admin
      await page.click('text=Log In')
      await page.fill('input[type="email"]', 'admin@example.com')
      await page.fill('input[type="password"]', 'adminpassword123')
      await page.click('button:has-text("Sign In")')

      // Wait for login to complete
      await page.waitForTimeout(2000)

      // Click on user avatar to open menu
      await page.click('[role="button"]:has(svg)')

      // Verify admin menu item IS present
      await expect(page.locator('text=Admin Dashboard')).toBeVisible()
    })

    test('admin can access admin dashboard', async ({ page }) => {
      // Log in as admin first
      await page.goto('/')
      await page.click('text=Log In')
      await page.fill('input[type="email"]', 'admin@example.com')
      await page.fill('input[type="password"]', 'adminpassword123')
      await page.click('button:has-text("Sign In")')
      await page.waitForTimeout(2000)

      // Navigate to admin dashboard
      await page.goto('/admin')

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
      await page.goto('/')
      await page.click('text=Log In')
      await page.fill('input[type="email"]', 'admin@example.com')
      await page.fill('input[type="password"]', 'adminpassword123')
      await page.click('button:has-text("Sign In")')
      await page.waitForTimeout(2000)

      // Go to admin dashboard
      await page.goto('/admin')

      // Wait for stats to load
      await page.waitForSelector('h3')

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
      await page.goto('/')
      await page.click('text=Log In')
      await page.fill('input[type="email"]', 'admin@example.com')
      await page.fill('input[type="password"]', 'adminpassword123')
      await page.click('button:has-text("Sign In")')
      await page.waitForTimeout(2000)

      // Go to admin dashboard
      await page.goto('/admin')

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
      await page.goto('/')
      await page.click('text=Log In')
      await page.fill('input[type="email"]', 'admin@example.com')
      await page.fill('input[type="password"]', 'adminpassword123')
      await page.click('button:has-text("Sign In")')
      await page.waitForTimeout(2000)

      // Go to settings
      await page.goto('/admin/settings')

      // Verify SMS auth section
      await expect(page.locator('text=SMS Authentication')).toBeVisible()
      await expect(page.locator('text=SMS Provider Status')).toBeVisible()

      // Verify configuration instructions are visible
      await expect(page.locator('text=To enable SMS authentication')).toBeVisible()
    })
  })
})
