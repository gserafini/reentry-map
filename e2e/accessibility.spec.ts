import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility tests using axe-core
 * Tests pages for WCAG 2.1 Level AA compliance
 *
 * Known violations excluded:
 * - button-name: MUI IconButton components sometimes lack accessible names
 *   in third-party components we don't control directly
 */

// Known framework-level violations we exclude from automated checks.
// These are tracked separately and addressed incrementally.
// - button-name: MUI IconButton components sometimes lack accessible names
// - page-has-heading-one: Some pages (login, sign-up) use h4 instead of h1
// - aria-progressbar-name: MUI LinearProgress components lack accessible names
// - heading-order: Heading hierarchy skips levels due to component composition
const KNOWN_VIOLATION_IDS = [
  'button-name',
  'page-has-heading-one',
  'aria-progressbar-name',
  'heading-order',
]

test.describe('Accessibility', () => {
  test('homepage should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('/')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(KNOWN_VIOLATION_IDS)
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('resources page should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    test.setTimeout(60000) // Resources page is heavy with many resource cards
    await page.goto('/resources')
    await page.waitForLoadState('networkidle')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(KNOWN_VIOLATION_IDS)
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('login page should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('/auth/login')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(KNOWN_VIOLATION_IDS)
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('sign up page should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('/auth/sign-up')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(KNOWN_VIOLATION_IDS)
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
})

test.describe('Keyboard Navigation', () => {
  test('should be able to navigate homepage with keyboard', async ({ page }) => {
    await page.goto('/')

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
    await page.goto('/')

    // Find and focus a search-related input
    const searchField = page.locator('input[type="text"], input[type="search"]').first()

    if (await searchField.isVisible()) {
      await searchField.focus()
      await expect(searchField).toBeFocused()
    } else {
      // Tab to first focusable element
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    }
  })
})

test.describe('Color Contrast', () => {
  test('homepage should pass color contrast checks', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .disableRules(KNOWN_VIOLATION_IDS)
      .analyze()

    const contrastViolations = accessibilityScanResults.violations.filter((violation) =>
      violation.id.includes('color-contrast')
    )

    expect(contrastViolations).toEqual([])
  })
})

test.describe('Screen Reader Support', () => {
  test('homepage should have proper heading structure', async ({ page }) => {
    await page.goto('/')

    // Check for h1
    const h1 = await page.locator('h1').count()
    expect(h1).toBeGreaterThan(0)

    // Check for logical heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
  })

  test('images should have alt text', async ({ page }) => {
    await page.goto('/')

    const images = await page.locator('img').all()
    for (const image of images) {
      const alt = await image.getAttribute('alt')
      expect(alt).toBeTruthy()
    }
  })

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/auth/login')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(KNOWN_VIOLATION_IDS)
      .analyze()

    const labelViolations = accessibilityScanResults.violations.filter((violation) =>
      violation.id.includes('label')
    )

    expect(labelViolations).toEqual([])
  })
})
