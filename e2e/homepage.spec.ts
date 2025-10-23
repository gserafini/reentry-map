import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('should respond to HTTP requests', async ({ page }) => {
    // Navigate to the homepage
    const response = await page.goto('/')

    // Check that the page responds (even if it shows an error)
    expect(response).toBeTruthy()
    expect(response?.status()).toBeLessThan(500)
  })

  test('should load HTML document', async ({ page }) => {
    await page.goto('/')

    // Check that we got an HTML document
    const html = await page.content()
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })

  test('should have a body element', async ({ page }) => {
    await page.goto('/')

    // Check that the page has a body element
    const body = page.locator('body')
    await expect(body).toBeAttached()
  })
})

// Note: Full E2E tests for homepage require proper Supabase configuration
// These are basic smoke tests to verify Playwright is set up correctly
// Add more comprehensive tests once the application is properly configured
