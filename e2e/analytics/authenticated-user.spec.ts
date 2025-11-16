import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * Analytics Integration Tests - Authenticated User
 *
 * Tests analytics tracking for authenticated (non-admin) users:
 * 1. User identification on sign-in
 * 2. User ID attached to all events
 * 3. User ID cleared on sign-out
 * 4. Session tracking with user context
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
)

test.describe('Analytics - Authenticated User', () => {
  let testSessionId: string
  let testUserId: string

  test.beforeAll(async () => {
    // Get a non-admin test user from database
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .eq('is_admin', false)
      .limit(1)

    if (!users || users.length === 0) {
      // Create a test user if none exists
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email: 'test-analytics@example.com',
          is_admin: false,
        })
        .select()
        .single()

      if (error || !newUser) {
        throw new Error('Could not create test user')
      }

      testUserId = newUser.id
      console.log(`[Test] Created test user: ${newUser.email} (${testUserId})`)
    } else {
      testUserId = users[0].id
      console.log(`[Test] Using existing test user: ${users[0].email} (${testUserId})`)
    }
  })

  test.beforeEach(async ({ page }) => {
    testSessionId = `auth-test-${Date.now()}`

    await page.addInitScript(
      ({ sessionId }) => {
        sessionStorage.setItem('analytics_session_id', sessionId)
        localStorage.setItem('analytics_enabled', 'true')
      },
      { sessionId: testSessionId }
    )
  })

  test.afterEach(async () => {
    // Clean up test data
    await supabase.from('analytics_page_views').delete().eq('session_id', testSessionId)
    await supabase.from('analytics_search_events').delete().eq('session_id', testSessionId)
    await supabase.from('analytics_resource_events').delete().eq('session_id', testSessionId)
    await supabase.from('analytics_sessions').delete().eq('session_id', testSessionId)
  })

  test('should identify user on sign-in', async ({ page }) => {
    // Simulate user sign-in by setting analytics user ID
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Simulate identifyUser() call (normally done by useAuth hook)
    await page.evaluate(
      async ({ userId }) => {
        const { identifyUser } = await import('@/lib/analytics/queue')
        identifyUser(userId)
      },
      { userId: testUserId }
    )

    // Verify user ID is stored in localStorage
    const storedUserId = await page.evaluate(() => localStorage.getItem('analytics_user_id'))

    expect(storedUserId).toBe(testUserId)
    console.log('[Test] ✅ User identified in analytics (localStorage set)')
  })

  test('should attach user_id to all events after sign-in', async ({ page }) => {
    // Set user ID before navigation
    await page.addInitScript(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
      },
      { userId: testUserId }
    )

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for analytics batch
    await page.waitForTimeout(6000)

    // Verify page view has user_id
    const { data: pageViews } = await supabase
      .from('analytics_page_views')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('page_path', '/')
      .order('timestamp', { ascending: false })
      .limit(1)

    expect(pageViews).not.toBeNull()
    expect(pageViews!.length).toBe(1)

    const pageView = pageViews![0]
    expect(pageView.user_id).toBe(testUserId) // ⭐ User ID should be attached
    expect(pageView.is_admin).toBe(false) // Non-admin user
    expect(pageView.anonymous_id).toBeTruthy() // Anonymous ID still exists

    console.log('[Test] ✅ User ID correctly attached to events')
  })

  test('should maintain user_id across multiple page views', async ({ page }) => {
    // Set user ID
    await page.addInitScript(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
      },
      { userId: testUserId }
    )

    // Navigate to multiple pages
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.goto('/resources')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(6000) // Final batch

    // Verify all page views have the same user_id
    const { data: allPageViews } = await supabase
      .from('analytics_page_views')
      .select('*')
      .eq('session_id', testSessionId)
      .order('timestamp', { ascending: false })

    expect(allPageViews).not.toBeNull()
    expect(allPageViews!.length).toBeGreaterThanOrEqual(3)

    // Check every page view has user_id
    allPageViews!.forEach((pageView, index) => {
      expect(pageView.user_id).toBe(testUserId)
      console.log(
        `[Test] ✅ Page ${index + 1}/${allPageViews!.length}: ${pageView.page_path} - user_id = ${testUserId}`
      )
    })
  })

  test('should clear user_id on sign-out', async ({ page }) => {
    // Set user ID
    await page.addInitScript(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
      },
      { userId: testUserId }
    )

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify user ID is set
    let storedUserId = await page.evaluate(() => localStorage.getItem('analytics_user_id'))
    expect(storedUserId).toBe(testUserId)

    // Simulate sign-out (normally done by useAuth hook)
    await page.evaluate(async () => {
      const { clearUser } = await import('@/lib/analytics/queue')
      clearUser()
    })

    // Verify user ID is cleared
    storedUserId = await page.evaluate(() => localStorage.getItem('analytics_user_id'))
    expect(storedUserId).toBeNull()

    console.log('[Test] ✅ User ID correctly cleared on sign-out')
  })

  test('should create session with user context', async ({ page }) => {
    // Set user ID
    await page.addInitScript(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
      },
      { userId: testUserId }
    )

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for analytics batch
    await page.waitForTimeout(6000)

    // Verify session was created with user_id
    const { data: sessions } = await supabase
      .from('analytics_sessions')
      .select('*')
      .eq('session_id', testSessionId)
      .limit(1)

    expect(sessions).not.toBeNull()
    expect(sessions!.length).toBe(1)

    const session = sessions![0]
    expect(session.user_id).toBe(testUserId) // ⭐ Session should have user_id
    expect(session.is_admin).toBe(false)
    expect(session.anonymous_id).toBeTruthy()

    console.log('[Test] ✅ Session created with user context')
  })

  test('should track resource interactions with user_id', async ({ page }) => {
    // Set user ID
    await page.addInitScript(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
      },
      { userId: testUserId }
    )

    // Navigate to a resource
    await page.goto('/ca/oakland')
    await page.waitForLoadState('networkidle')

    const firstResource = page.locator('[data-testid="resource-card"]').first()
    await firstResource.click()
    await page.waitForURL('**/ca/oakland/**')
    await page.waitForLoadState('networkidle')

    // Wait for analytics batch
    await page.waitForTimeout(6000)

    // Verify resource view has user_id
    const { data: resourceViews } = await supabase
      .from('analytics_resource_events')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('event_type', 'view')
      .order('timestamp', { ascending: false })
      .limit(1)

    expect(resourceViews).not.toBeNull()
    expect(resourceViews!.length).toBe(1)

    const resourceView = resourceViews![0]
    expect(resourceView.user_id).toBe(testUserId)
    expect(resourceView.is_admin).toBe(false)

    console.log('[Test] ✅ Resource interactions tracked with user_id')
  })

  test('anonymous_id should persist after sign-in', async ({ page }) => {
    // Start as anonymous user
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Get anonymous ID
    const anonymousId = await page.evaluate(() => localStorage.getItem('analytics_anonymous_id'))
    expect(anonymousId).toBeTruthy()

    // "Sign in" by identifying user
    await page.evaluate(
      async ({ userId }) => {
        const { identifyUser } = await import('@/lib/analytics/queue')
        identifyUser(userId)
      },
      { userId: testUserId }
    )

    // Anonymous ID should still exist (for cross-device tracking)
    const anonymousIdAfterSignIn = await page.evaluate(() =>
      localStorage.getItem('analytics_anonymous_id')
    )

    expect(anonymousIdAfterSignIn).toBe(anonymousId) // Should be unchanged

    console.log('[Test] ✅ Anonymous ID persists after sign-in (enables cross-device tracking)')
  })

  test('should differentiate between anonymous and authenticated sessions', async ({ page }) => {
    // Visit as anonymous
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(6000)

    // Get anonymous page views
    const { data: anonPageViews } = await supabase
      .from('analytics_page_views')
      .select('*')
      .eq('session_id', testSessionId)
      .is('user_id', null)

    const anonCount = anonPageViews?.length || 0

    // "Sign in"
    await page.evaluate(
      async ({ userId }) => {
        const { identifyUser } = await import('@/lib/analytics/queue')
        identifyUser(userId)
      },
      { userId: testUserId }
    )

    // Navigate more
    await page.goto('/ca/oakland')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(6000)

    // Get authenticated page views
    const { data: authPageViews } = await supabase
      .from('analytics_page_views')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('user_id', testUserId)

    const authCount = authPageViews?.length || 0

    console.log(`[Test] Anonymous page views: ${anonCount}`)
    console.log(`[Test] Authenticated page views: ${authCount}`)

    expect(anonCount).toBeGreaterThan(0)
    expect(authCount).toBeGreaterThan(0)

    console.log('[Test] ✅ Can differentiate anonymous vs authenticated activity')
  })

  test('should track user journey from anonymous to authenticated', async ({ page }) => {
    // Start anonymous
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Search as anonymous
    const searchInput = page.locator('input[placeholder*="What are you looking for"]')
    await searchInput.fill('employment')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL('**/search**')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(2000)

    // "Sign in"
    await page.evaluate(
      async ({ userId }) => {
        const { identifyUser } = await import('@/lib/analytics/queue')
        identifyUser(userId)
      },
      { userId: testUserId }
    )

    // Continue journey as authenticated user
    await page.goto('/ca/oakland')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(6000) // Final batch

    // Get all events for this session
    const { data: allEvents } = await supabase
      .from('analytics_page_views')
      .select('*')
      .eq('session_id', testSessionId)
      .order('timestamp', { ascending: true })

    expect(allEvents).not.toBeNull()
    expect(allEvents!.length).toBeGreaterThan(0)

    // Verify journey: starts as anonymous, becomes authenticated
    const anonymousEvents = allEvents!.filter((e) => e.user_id === null)
    const authenticatedEvents = allEvents!.filter((e) => e.user_id === testUserId)

    console.log(`[Test] Journey breakdown:`)
    console.log(`  Anonymous events: ${anonymousEvents.length}`)
    console.log(`  Authenticated events: ${authenticatedEvents.length}`)

    // Should have both phases
    expect(anonymousEvents.length).toBeGreaterThan(0)
    expect(authenticatedEvents.length).toBeGreaterThan(0)

    // Authenticated events should come after anonymous events (by timestamp)
    if (anonymousEvents.length > 0 && authenticatedEvents.length > 0) {
      const lastAnonTimestamp = new Date(
        anonymousEvents[anonymousEvents.length - 1].timestamp
      ).getTime()
      const firstAuthTimestamp = new Date(authenticatedEvents[0].timestamp).getTime()

      expect(firstAuthTimestamp).toBeGreaterThanOrEqual(lastAnonTimestamp)
      console.log('[Test] ✅ Journey correctly tracked: anonymous → authenticated')
    }
  })
})
