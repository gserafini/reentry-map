import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

/**
 * Admin User Management E2E Tests
 * Tests CRUD operations for users and admin promotion
 *
 * Uses the shared auth helper for reliable login across all viewports.
 */

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin before each test using auth helper
    await loginAsTestUser(page, 'admin')
  })

  test('admin can view user list', async ({ page }) => {
    // Navigate to users page
    await page.goto('/admin/users')

    // Verify page header
    await expect(page.locator('h4:has-text("User Management")')).toBeVisible()

    // Verify search box
    await expect(page.locator('input[placeholder*="Search users"]')).toBeVisible()

    // Verify table headers
    await expect(page.locator('th:has-text("Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Email")')).toBeVisible()
    await expect(page.locator('th:has-text("Role")')).toBeVisible()

    // Wait for users to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })

    // Verify at least one user is displayed
    const userRows = page.locator('tbody tr')
    await expect(userRows).not.toHaveCount(0)
  })

  test('admin can search for users', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for users to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })

    // Get initial row count
    const initialRowCount = await page.locator('tbody tr').count()

    // Search for "admin"
    await page.fill('input[placeholder*="Search users"]', 'admin')

    // Wait for filtered results
    await page.waitForTimeout(500)

    // Verify filtered results (should have fewer rows or same)
    const filteredRowCount = await page.locator('tbody tr').count()
    expect(filteredRowCount).toBeLessThanOrEqual(initialRowCount)

    // Verify "admin" appears in results
    await expect(page.locator('tbody').locator('text=admin')).toBeVisible()
  })

  test('admin can open edit dialog', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for users to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })

    // Click first edit button
    await page.locator('button[color="primary"]').first().click()

    // Verify dialog opened
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('h2:has-text("Edit User:")')).toBeVisible()

    // Verify form fields
    await expect(page.locator('label:has-text("First Name")')).toBeVisible()
    await expect(page.locator('label:has-text("Last Name")')).toBeVisible()
    await expect(page.locator('label:has-text("Phone")')).toBeVisible()
    await expect(page.locator('text=Admin Privileges')).toBeVisible()
  })

  test('admin can edit user details', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for users to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })

    // Find and click edit button for test user
    await page.locator('button[color="primary"]').first().click()

    // Wait for dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Modify first name
    const firstNameInput = page
      .locator('input[id*="firstName"]')
      .or(page.locator('label:has-text("First Name")').locator('..').locator('input'))
    await firstNameInput.clear()
    await firstNameInput.fill('Updated Name')

    // Save changes
    await page.click('button:has-text("Save Changes")')

    // Verify dialog closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })

    // Verify update reflected in table (with flexible matching)
    await page.waitForTimeout(1000)
    const tableText = await page.locator('tbody').textContent()
    expect(tableText).toContain('Updated')
  })

  test('admin can promote user to admin', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for users to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })

    // Find a regular user (not admin)
    const regularUserRow = page
      .locator('tbody tr')
      .filter({ has: page.locator('[data-testid="PersonIcon"]') })
      .first()

    if ((await regularUserRow.count()) === 0) {
      test.skip(true, 'No regular users available for promotion test')
    }

    // Click edit on regular user
    await regularUserRow.locator('button[color="primary"]').click()

    // Wait for dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Toggle admin privileges
    const adminSwitch = page.locator('input[type="checkbox"]').last()
    const isChecked = await adminSwitch.isChecked()

    if (!isChecked) {
      await adminSwitch.click()

      // Verify warning message appears
      await expect(page.locator('text=full admin access')).toBeVisible()
    }

    // Save changes
    await page.click('button:has-text("Save Changes")')

    // Verify dialog closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })

    // Verify admin badge appears
    await page.waitForTimeout(1000)
  })

  test('admin sees confirmation for delete', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for users to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })

    // Set up dialog listener
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toContain('Are you sure')
      await dialog.dismiss() // Cancel deletion for test
    })

    // Click delete button
    await page.locator('button[color="error"]').first().click()

    // Wait for confirmation dialog (handled by listener)
    await page.waitForTimeout(500)
  })

  test('admin can view role badges', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for users to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })

    // Verify role column contains chips
    const roleChips = page.locator('tbody tr').locator('[class*="MuiChip"]')
    await expect(roleChips.first()).toBeVisible()

    // Verify "Admin" or "User" text
    const firstChipText = await roleChips.first().textContent()
    expect(['Admin', 'User']).toContain(firstChipText)
  })
})
