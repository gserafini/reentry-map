import { test, expect } from '@playwright/test'
import postgres from 'postgres'

/**
 * Analytics Integration Tests - Authenticated User
 *
 * Tests analytics tracking for authenticated (non-admin) users:
 * 1. User identification on sign-in
 * 2. User ID attached to all events
 * 3. User ID cleared on sign-out
 * 4. Session tracking with user context
 *
 * Prerequisites: Analytics database tables must exist.
 * Tests are automatically skipped if the database or tables are not available.
 */

type SqlClient = ReturnType<typeof postgres>
let sql: SqlClient | null = null
let dbAvailable = false

test.describe('Analytics - Authenticated User', () => {
  let testSessionId: string
  let testUserId: string

  test.beforeAll(async () => {
    try {
      sql = postgres(
        process.env.DATABASE_URL || 'postgresql://reentrymap:password@localhost:5432/reentry_map',
        { connect_timeout: 3 }
      )
      await sql`SELECT 1 FROM analytics_page_views LIMIT 0`
      dbAvailable = true

      // Get a non-admin test user from database
      const users = await sql`
        SELECT id, email FROM users
        WHERE is_admin = false
        LIMIT 1
      `

      if (!users || users.length === 0) {
        // Create a test user if none exists
        const newUsers = await sql`
          INSERT INTO users (email, is_admin)
          VALUES ('test-analytics@example.com', false)
          RETURNING *
        `

        if (!newUsers || newUsers.length === 0) {
          throw new Error('Could not create test user')
        }

        testUserId = newUsers[0].id
        console.log(`[Test] Created test user: ${newUsers[0].email} (${testUserId})`)
      } else {
        testUserId = users[0].id
        console.log(`[Test] Using existing test user: ${users[0].email} (${testUserId})`)
      }
    } catch (error) {
      console.warn(
        '[Analytics Tests] Database or analytics tables not available - tests will be skipped',
        error
      )
      dbAvailable = false
      if (sql) {
        try {
          await sql.end()
        } catch {}
        sql = null
      }
    }
  })

  test.beforeEach(async ({ page }) => {
    test.skip(!dbAvailable, 'Analytics database tables not available')

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
    if (!dbAvailable || !sql) return

    // Clean up test data
    await sql`DELETE FROM analytics_page_views WHERE session_id = ${testSessionId}`
    await sql`DELETE FROM analytics_search_events WHERE session_id = ${testSessionId}`
    await sql`DELETE FROM analytics_resource_events WHERE session_id = ${testSessionId}`
    await sql`DELETE FROM analytics_sessions WHERE session_id = ${testSessionId}`
  })

  test.afterAll(async () => {
    if (sql) {
      try {
        await sql.end()
      } catch {}
    }
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
    console.log('[Test] User identified in analytics (localStorage set)')
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
    const pageViews = await sql!`
      SELECT * FROM analytics_page_views
      WHERE session_id = ${testSessionId}
        AND page_path = '/'
      ORDER BY timestamp DESC
      LIMIT 1
    `

    expect(pageViews).not.toBeNull()
    expect(pageViews.length).toBe(1)

    const pageView = pageViews[0]
    expect(pageView.user_id).toBe(testUserId)
    expect(pageView.is_admin).toBe(false)
    expect(pageView.anonymous_id).toBeTruthy()

    console.log('[Test] User ID correctly attached to events')
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
    const allPageViews = await sql!`
      SELECT * FROM analytics_page_views
      WHERE session_id = ${testSessionId}
      ORDER BY timestamp DESC
    `

    expect(allPageViews).not.toBeNull()
    expect(allPageViews.length).toBeGreaterThanOrEqual(3)

    // Check every page view has user_id
    allPageViews.forEach((pageView, index) => {
      expect(pageView.user_id).toBe(testUserId)
      console.log(
        `[Test] Page ${index + 1}/${allPageViews.length}: ${pageView.page_path} - user_id = ${testUserId}`
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

    console.log('[Test] User ID correctly cleared on sign-out')
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
    const sessions = await sql!`
      SELECT * FROM analytics_sessions
      WHERE session_id = ${testSessionId}
      LIMIT 1
    `

    expect(sessions).not.toBeNull()
    expect(sessions.length).toBe(1)

    const session = sessions[0]
    expect(session.user_id).toBe(testUserId)
    expect(session.is_admin).toBe(false)
    expect(session.anonymous_id).toBeTruthy()

    console.log('[Test] Session created with user context')
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
    const resourceViews = await sql!`
      SELECT * FROM analytics_resource_events
      WHERE session_id = ${testSessionId}
        AND event_type = 'view'
      ORDER BY timestamp DESC
      LIMIT 1
    `

    expect(resourceViews).not.toBeNull()
    expect(resourceViews.length).toBe(1)

    const resourceView = resourceViews[0]
    expect(resourceView.user_id).toBe(testUserId)
    expect(resourceView.is_admin).toBe(false)

    console.log('[Test] Resource interactions tracked with user_id')
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

    console.log('[Test] Anonymous ID persists after sign-in (enables cross-device tracking)')
  })

  test('should differentiate between anonymous and authenticated sessions', async ({ page }) => {
    // Visit as anonymous
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(6000)

    // Get anonymous page views
    const anonPageViews = await sql!`
      SELECT * FROM analytics_page_views
      WHERE session_id = ${testSessionId}
        AND user_id IS NULL
    `

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
    const authPageViews = await sql!`
      SELECT * FROM analytics_page_views
      WHERE session_id = ${testSessionId}
        AND user_id = ${testUserId}
    `

    const authCount = authPageViews?.length || 0

    console.log(`[Test] Anonymous page views: ${anonCount}`)
    console.log(`[Test] Authenticated page views: ${authCount}`)

    expect(anonCount).toBeGreaterThan(0)
    expect(authCount).toBeGreaterThan(0)

    console.log('[Test] Can differentiate anonymous vs authenticated activity')
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
    const allEvents = await sql!`
      SELECT * FROM analytics_page_views
      WHERE session_id = ${testSessionId}
      ORDER BY timestamp ASC
    `

    expect(allEvents).not.toBeNull()
    expect(allEvents.length).toBeGreaterThan(0)

    // Verify journey: starts as anonymous, becomes authenticated
    const anonymousEvents = allEvents.filter((e) => e.user_id === null)
    const authenticatedEvents = allEvents.filter((e) => e.user_id === testUserId)

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
      console.log('[Test] Journey correctly tracked: anonymous -> authenticated')
    }
  })
})
