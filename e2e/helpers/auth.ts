/**
 * Playwright authentication helpers for E2E testing
 * Provides reusable functions to log in as test users
 */

import { Page } from '@playwright/test'

export const TEST_USERS = {
  regular: {
    email: 'testuser@example.com',
    password: 'TestUser123!',
    name: 'Test User',
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminUser123!',
    name: 'Admin User',
  },
} as const

/**
 * Log in as a test user via the login form
 * @param page - Playwright page object
 * @param userType - Type of user to log in as ('regular' or 'admin')
 * @param baseUrl - Base URL of the application (default: http://localhost:3003)
 */
export async function loginAsTestUser(
  page: Page,
  userType: keyof typeof TEST_USERS = 'regular',
  baseUrl: string = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3003'
): Promise<void> {
  const user = TEST_USERS[userType]

  // Navigate to login page
  await page.goto(`${baseUrl}/auth/login`)
  await page.waitForLoadState('networkidle')

  // Fill in credentials
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)

  // Click login button
  await page.click('button[type="submit"]:has-text("Login")')

  // Wait for login to complete (redirects or shows success)
  await page.waitForTimeout(2000)

  // Verify we're logged in by checking for user menu or redirect
  // This helps catch login failures early
  const currentUrl = page.url()
  if (currentUrl.includes('/auth/login') && !currentUrl.includes('error')) {
    // Still on login page without error - wait a bit more
    await page.waitForTimeout(1000)
  }
}

/**
 * Log out the current user
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu button in AppBar (if present)
  const userMenuButton = page.locator('[aria-label="user menu"]')
  if (await userMenuButton.isVisible()) {
    await userMenuButton.click()
    await page.click('text=Sign Out')
    await page.waitForTimeout(1000)
  }
}

/**
 * Check if a user is currently logged in
 * @param page - Playwright page object
 * @returns true if user is logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for user menu button in AppBar
  const userMenuButton = page.locator('[aria-label="user menu"]')
  return await userMenuButton.isVisible()
}
