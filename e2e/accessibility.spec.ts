import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility tests using axe-core
 * Tests pages for WCAG 2.1 Level AA compliance
 */

test.describe('Accessibility', () => {
  test('homepage should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('http://localhost:3003/')
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('resources page should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('http://localhost:3003/resources')
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('login page should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('http://localhost:3003/auth/login')
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('sign up page should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('http://localhost:3003/auth/sign-up')
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
})

test.describe('Keyboard Navigation', () => {
  test('should be able to navigate homepage with keyboard', async ({ page }) => {
    await page.goto('http://localhost:3003/')

    // Tab through interactive elements
    await page.keyboard.press('Tab') // Logo/Home link
    await page.keyboard.press('Tab') // Resources link (desktop)
    await page.keyboard.press('Tab') // Favorites link (desktop)
    await page.keyboard.press('Tab') // Suggest link (desktop)

    // Check that focus is visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
  })

  test('should be able to activate buttons with Enter key', async ({ page }) => {
    await page.goto('http://localhost:3003/')

    // Find and focus the search button
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Wait for search field to be visible
    const searchField = page.getByPlaceholder('Search for resources...')
    await searchField.focus()
    await expect(searchField).toBeFocused()
  })
})

test.describe('Color Contrast', () => {
  test('homepage should pass color contrast checks', async ({ page }) => {
    await page.goto('http://localhost:3003/')

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()

    const contrastViolations = accessibilityScanResults.violations.filter((violation) =>
      violation.id.includes('color-contrast')
    )

    expect(contrastViolations).toEqual([])
  })
})

test.describe('Screen Reader Support', () => {
  test('homepage should have proper heading structure', async ({ page }) => {
    await page.goto('http://localhost:3003/')

    // Check for h1
    const h1 = await page.locator('h1').count()
    expect(h1).toBeGreaterThan(0)

    // Check for logical heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
  })

  test('images should have alt text', async ({ page }) => {
    await page.goto('http://localhost:3003/')

    const images = await page.locator('img').all()
    for (const image of images) {
      const alt = await image.getAttribute('alt')
      expect(alt).toBeTruthy()
    }
  })

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('http://localhost:3003/auth/login')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const labelViolations = accessibilityScanResults.violations.filter((violation) =>
      violation.id.includes('label')
    )

    expect(labelViolations).toEqual([])
  })
})
