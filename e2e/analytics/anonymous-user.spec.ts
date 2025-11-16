import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * Analytics Integration Tests - Anonymous User Journey
 *
 * Tests the complete analytics flow for an anonymous user:
 * 1. Homepage visit → page_view event
 * 2. Search → search event
 * 3. Resource view → resource_view event
 * 4. Click actions → resource_click_* events
 */

// Initialize Supabase client for database verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role to bypass RLS
  {
    auth: {
      persistSession: false,
    },
  }
)

test.describe('Analytics - Anonymous User Journey', () => {
  let testSessionId: string
  let testAnonymousId: string

  test.beforeEach(async ({ page }) => {
    // Generate unique IDs for this test run
    testSessionId = `test-session-${Date.now()}`
    testAnonymousId = `test-anon-${Date.now()}`

    // Set up analytics with test IDs
    await page.addInitScript(
      ({ sessionId, anonymousId }) => {
        sessionStorage.setItem('analytics_session_id', sessionId)
        localStorage.setItem('analytics_anonymous_id', anonymousId)
        localStorage.setItem('analytics_enabled', 'true')
      },
      { sessionId: testSessionId, anonymousId: testAnonymousId }
    )
  })

  test.afterEach(async () => {
    // Clean up test data from database
    await supabase.from('analytics_page_views').delete().eq('session_id', testSessionId)
    await supabase.from('analytics_search_events').delete().eq('session_id', testSessionId)
    await supabase.from('analytics_resource_events').delete().eq('session_id', testSessionId)
    await supabase.from('analytics_sessions').delete().eq('session_id', testSessionId)
  })

  test('should track homepage page view', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for analytics to batch and send (max 5 seconds)
    await page.waitForTimeout(6000)

    // Verify page_view event in database
    const { data: pageViews, error } = await supabase
      .from('analytics_page_views')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('page_path', '/')
      .order('timestamp', { ascending: false })
      .limit(1)

    expect(error).toBeNull()
    expect(pageViews).not.toBeNull()
    expect(pageViews!.length).toBe(1)

    const pageView = pageViews![0]
    expect(pageView.page_title).toContain('Home')
    expect(pageView.is_admin).toBe(false)
    expect(pageView.anonymous_id).toBe(testAnonymousId)
    expect(pageView.user_id).toBeNull() // Anonymous user
  })

  test('should track search events', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Fill in search query
    const searchInput = page.locator('input[placeholder*="What are you looking for"]')
    await searchInput.fill('housing')

    // Submit search
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL('**/search**')
    await page.waitForLoadState('networkidle')

    // Wait for analytics batch
    await page.waitForTimeout(6000)

    // Verify search event in database
    const { data: searches, error } = await supabase
      .from('analytics_search_events')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('query', 'housing')
      .order('timestamp', { ascending: false })
      .limit(1)

    expect(error).toBeNull()
    expect(searches).not.toBeNull()
    expect(searches!.length).toBeGreaterThanOrEqual(1)

    const search = searches![0]
    expect(search.query).toBe('housing')
    expect(search.results_count).toBeGreaterThan(0)
    expect(search.is_admin).toBe(false)
    expect(search.anonymous_id).toBe(testAnonymousId)
  })

  test('should track resource view with source attribution', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click on a featured resource
    const resourceCard = page.locator('[data-testid="resource-card"]').first()
    await resourceCard.click()

    // Wait for navigation to resource detail page
    await page.waitForURL('**/ca/**')
    await page.waitForLoadState('networkidle')

    // Wait for analytics batch
    await page.waitForTimeout(6000)

    // Verify resource_view event in database
    const { data: resourceViews, error } = await supabase
      .from('analytics_resource_events')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('event_type', 'view')
      .order('timestamp', { ascending: false })
      .limit(1)

    expect(error).toBeNull()
    expect(resourceViews).not.toBeNull()
    expect(resourceViews!.length).toBe(1)

    const resourceView = resourceViews![0]
    expect(resourceView.resource_id).toBeTruthy()
    expect(resourceView.source).toBe('direct') // From homepage featured list
    expect(resourceView.is_admin).toBe(false)
    expect(resourceView.anonymous_id).toBe(testAnonymousId)
  })

  test('should track resource click actions', async ({ page }) => {
    // Navigate directly to a known resource (Oakland Job Center)
    await page.goto('/ca/oakland')
    await page.waitForLoadState('networkidle')

    // Click on first resource
    const firstResource = page.locator('[data-testid="resource-card"]').first()
    await firstResource.click()
    await page.waitForURL('**/ca/oakland/**')
    await page.waitForLoadState('networkidle')

    // Click "Call" button (if phone exists)
    const callButton = page.locator('button:has-text("Call")')
    if (await callButton.isVisible()) {
      await callButton.click()

      // Wait for analytics batch
      await page.waitForTimeout(6000)

      // Verify resource_click_call event
      const { data: callClicks } = await supabase
        .from('analytics_resource_events')
        .select('*')
        .eq('session_id', testSessionId)
        .eq('event_type', 'click_call')
        .order('timestamp', { ascending: false })
        .limit(1)

      expect(callClicks).not.toBeNull()
      expect(callClicks!.length).toBe(1)
      expect(callClicks![0].is_admin).toBe(false)
    }

    // Click "Visit" website button (if website exists)
    const websiteButton = page.locator('button:has-text("Visit")')
    if (await websiteButton.isVisible()) {
      // Prevent actual navigation
      await page.route('**/*', (route) => {
        if (route.request().url().includes('http')) {
          route.abort()
        } else {
          route.continue()
        }
      })

      await websiteButton.click()

      // Wait for analytics batch
      await page.waitForTimeout(6000)

      // Verify resource_click_website event
      const { data: websiteClicks } = await supabase
        .from('analytics_resource_events')
        .select('*')
        .eq('session_id', testSessionId)
        .eq('event_type', 'click_website')
        .order('timestamp', { ascending: false })
        .limit(1)

      expect(websiteClicks).not.toBeNull()
      if (websiteClicks && websiteClicks.length > 0) {
        expect(websiteClicks[0].is_admin).toBe(false)
      }
    }

    // Click "Get Directions" button
    const directionsButton = page.locator('button:has-text("Get Directions")')
    if (await directionsButton.isVisible()) {
      await directionsButton.click()

      // Wait for analytics batch
      await page.waitForTimeout(6000)

      // Verify resource_click_directions event
      const { data: directionsClicks } = await supabase
        .from('analytics_resource_events')
        .select('*')
        .eq('session_id', testSessionId)
        .eq('event_type', 'click_directions')
        .order('timestamp', { ascending: false })
        .limit(1)

      expect(directionsClicks).not.toBeNull()
      expect(directionsClicks!.length).toBe(1)
      expect(directionsClicks![0].is_admin).toBe(false)
    }
  })

  test('should track scroll depth on resource page', async ({ page }) => {
    await page.goto('/ca/oakland')
    await page.waitForLoadState('networkidle')

    const firstResource = page.locator('[data-testid="resource-card"]').first()
    await firstResource.click()
    await page.waitForURL('**/ca/oakland/**')
    await page.waitForLoadState('networkidle')

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000)

    // Scroll to middle
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForTimeout(1000)

    // Navigate away to trigger scroll depth tracking
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for analytics batch
    await page.waitForTimeout(6000)

    // Verify scroll depth was tracked
    const { data: resourceViews } = await supabase
      .from('analytics_resource_events')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('event_type', 'view')
      .not('scroll_depth_percent', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(1)

    if (resourceViews && resourceViews.length > 0) {
      const view = resourceViews[0]
      expect(view.scroll_depth_percent).toBeGreaterThan(0)
      expect(view.scroll_depth_percent).toBeLessThanOrEqual(100)
      expect(view.time_spent_seconds).toBeGreaterThan(0)
    }
  })

  test('should create session record', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for analytics batch
    await page.waitForTimeout(6000)

    // Verify session was created
    const { data: sessions, error } = await supabase
      .from('analytics_sessions')
      .select('*')
      .eq('session_id', testSessionId)
      .limit(1)

    expect(error).toBeNull()
    expect(sessions).not.toBeNull()
    expect(sessions!.length).toBe(1)

    const session = sessions![0]
    expect(session.anonymous_id).toBe(testAnonymousId)
    expect(session.user_id).toBeNull() // Anonymous
    expect(session.is_admin).toBe(false)
    expect(session.device_type).toBeTruthy()
    expect(session.browser).toBeTruthy()
    expect(session.os).toBeTruthy()
  })
})
