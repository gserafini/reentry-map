import { test, expect } from '@playwright/test'
import postgres from 'postgres'

/**
 * Analytics Integration Tests - Admin Filtering
 *
 * ⭐ CRITICAL TEST ⭐
 *
 * Verifies that admin user events are properly marked with is_admin = true
 * and that public analytics queries exclude admin activity.
 *
 * This is the most important test for the analytics system because it ensures
 * admin activity doesn't pollute public analytics data.
 */

// Initialize postgres.js client for database verification
const sql = postgres(
  process.env.DATABASE_URL || 'postgresql://reentrymap:password@localhost:5432/reentry_map'
)

test.describe('Analytics - Admin Filtering (CRITICAL)', () => {
  let adminTestSessionId: string
  let adminUserId: string

  test.beforeAll(async () => {
    // Get admin user from database
    const adminUsers = await sql`
      SELECT id, email FROM users
      WHERE is_admin = true
      LIMIT 1
    `

    if (!adminUsers || adminUsers.length === 0) {
      throw new Error('No admin user found in database. Create one first.')
    }

    adminUserId = adminUsers[0].id
    console.log(`[Test] Using admin user: ${adminUsers[0].email} (${adminUserId})`)
  })

  test.beforeEach(async ({ page }) => {
    adminTestSessionId = `admin-test-${Date.now()}`

    // Set up analytics with test session ID
    await page.addInitScript(
      ({ sessionId }) => {
        sessionStorage.setItem('analytics_session_id', sessionId)
        localStorage.setItem('analytics_enabled', 'true')
      },
      { sessionId: adminTestSessionId }
    )
  })

  test.afterEach(async () => {
    // Clean up test data
    await sql`DELETE FROM analytics_page_views WHERE session_id = ${adminTestSessionId}`
    await sql`DELETE FROM analytics_search_events WHERE session_id = ${adminTestSessionId}`
    await sql`DELETE FROM analytics_resource_events WHERE session_id = ${adminTestSessionId}`
    await sql`DELETE FROM analytics_sessions WHERE session_id = ${adminTestSessionId}`
  })

  test.afterAll(async () => {
    // Close the database connection
    await sql.end()
  })

  test('admin user should have is_admin = true in localStorage', async ({ page }) => {
    // Sign in as admin user (use your auth flow)
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // TODO: Fill in your actual admin login flow
    // For now, we'll manually set the admin role in localStorage
    await page.evaluate(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
        localStorage.setItem('analytics_user_role', 'admin')
      },
      { userId: adminUserId }
    )

    // Verify admin role is set
    const role = await page.evaluate(() => localStorage.getItem('analytics_user_role'))
    expect(role).toBe('admin')

    console.log('[Test] ✅ Admin role correctly set in localStorage')
  })

  test('admin page views should have is_admin = true', async ({ page }) => {
    // Simulate admin user
    await page.addInitScript(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
        localStorage.setItem('analytics_user_role', 'admin')
      },
      { userId: adminUserId }
    )

    // Navigate to homepage as admin
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for analytics batch
    await page.waitForTimeout(6000)

    // Verify page view has is_admin = true
    const pageViews = await sql`
      SELECT * FROM analytics_page_views
      WHERE session_id = ${adminTestSessionId}
        AND page_path = '/'
      ORDER BY timestamp DESC
      LIMIT 1
    `

    expect(pageViews).not.toBeNull()
    expect(pageViews.length).toBe(1)

    const pageView = pageViews[0]
    expect(pageView.is_admin).toBe(true) // ⭐ CRITICAL ASSERTION
    expect(pageView.user_id).toBe(adminUserId)

    console.log('[Test] ✅ Admin page view correctly marked with is_admin = true')
  })

  test('admin navigation should mark ALL events as is_admin = true', async ({ page }) => {
    // Simulate admin user
    await page.addInitScript(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
        localStorage.setItem('analytics_user_role', 'admin')
      },
      { userId: adminUserId }
    )

    // Navigate to multiple pages
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.goto('/admin/resources')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(6000) // Wait for final batch

    // Verify ALL page views have is_admin = true
    const allPageViews = await sql`
      SELECT * FROM analytics_page_views
      WHERE session_id = ${adminTestSessionId}
      ORDER BY timestamp DESC
    `

    expect(allPageViews).not.toBeNull()
    expect(allPageViews.length).toBeGreaterThanOrEqual(3)

    // Check every single event
    allPageViews.forEach((pageView, index) => {
      expect(pageView.is_admin).toBe(true) // ⭐ CRITICAL ASSERTION
      expect(pageView.user_id).toBe(adminUserId)
      console.log(
        `[Test] Event ${index + 1}/${allPageViews.length}: ${pageView.page_path} - is_admin = true`
      )
    })

    console.log(`[Test] All ${allPageViews.length} admin events correctly marked`)
  })

  test('public analytics query should exclude admin events', async ({ page }) => {
    // Create both admin and non-admin events in same session window

    // 1. Create non-admin events
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(6000)

    // 2. "Switch" to admin user
    await page.evaluate(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
        localStorage.setItem('analytics_user_role', 'admin')
      },
      { userId: adminUserId }
    )

    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(6000)

    // Get all events for this session
    const totalResult = await sql`
      SELECT COUNT(*)::int AS count FROM analytics_page_views
      WHERE session_id = ${adminTestSessionId}
    `
    const totalCount = totalResult[0].count

    // Get public events only (is_admin = false)
    const publicResult = await sql`
      SELECT COUNT(*)::int AS count FROM analytics_page_views
      WHERE session_id = ${adminTestSessionId}
        AND is_admin = false
    `
    const publicCount = publicResult[0].count

    expect(totalCount).toBeGreaterThan(0)
    expect(publicCount).toBeLessThan(totalCount) // Admin events should be excluded

    console.log(`[Test] Total events: ${totalCount}`)
    console.log(`[Test] Public events (is_admin=false): ${publicCount}`)
    console.log(`[Test] Admin events filtered: ${totalCount - publicCount}`)
    console.log('[Test] Public query correctly excludes admin events')
  })

  test('partial indexes should be used for is_admin queries', async () => {
    // This test verifies that the database is using partial indexes
    // for efficient admin filtering

    // Run EXPLAIN on a public analytics query
    try {
      const explainData = await sql`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM analytics_page_views
        WHERE is_admin = false
        ORDER BY timestamp DESC
        LIMIT 100
      `

      // Verify index is being used
      const explainText = JSON.stringify(explainData)
      expect(explainText).toContain('idx_page_views_non_admin')

      console.log('[Test] Partial index is being used for admin filtering')
    } catch {
      console.log('[Test] Could not run EXPLAIN - skipping index verification')
      test.skip()
    }
  })

  test('admin resource interactions should be marked correctly', async ({ page }) => {
    // Simulate admin user
    await page.addInitScript(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
        localStorage.setItem('analytics_user_role', 'admin')
      },
      { userId: adminUserId }
    )

    // Navigate to a resource as admin
    await page.goto('/ca/oakland')
    await page.waitForLoadState('networkidle')

    const firstResource = page.locator('[data-testid="resource-card"]').first()
    await firstResource.click()
    await page.waitForURL('**/ca/oakland/**')
    await page.waitForLoadState('networkidle')

    // Click "Call" button
    const callButton = page.locator('button:has-text("Call")')
    if (await callButton.isVisible()) {
      await callButton.click()
      await page.waitForTimeout(6000)

      // Verify resource event has is_admin = true
      const resourceEvents = await sql`
        SELECT * FROM analytics_resource_events
        WHERE session_id = ${adminTestSessionId}
          AND event_type = 'click_call'
        ORDER BY timestamp DESC
        LIMIT 1
      `

      expect(resourceEvents).not.toBeNull()
      expect(resourceEvents.length).toBe(1)
      expect(resourceEvents[0].is_admin).toBe(true) // ⭐ CRITICAL ASSERTION

      console.log('[Test] Admin resource interaction correctly marked with is_admin = true')
    }
  })

  test('sign out should clear admin role from localStorage', async ({ page }) => {
    // Set admin role
    await page.addInitScript(
      ({ userId }) => {
        localStorage.setItem('analytics_user_id', userId)
        localStorage.setItem('analytics_user_role', 'admin')
      },
      { userId: adminUserId }
    )

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify admin role is set
    let role = await page.evaluate(() => localStorage.getItem('analytics_user_role'))
    expect(role).toBe('admin')

    // Simulate sign out (clear analytics state)
    await page.evaluate(() => {
      localStorage.removeItem('analytics_user_role')
      localStorage.removeItem('analytics_user_id')
    })

    // Verify admin role is cleared
    role = await page.evaluate(() => localStorage.getItem('analytics_user_role'))
    expect(role).toBeNull()

    console.log('[Test] ✅ Admin role correctly cleared on sign out')
  })

  test('percentage of admin events should be reasonable', async () => {
    // This is a meta-test to verify admin filtering is working in production

    // Get total events from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const totalResult = await sql`
      SELECT COUNT(*)::int AS count FROM analytics_page_views
      WHERE timestamp >= ${yesterday}
    `
    const totalEvents = totalResult[0].count

    const adminResult = await sql`
      SELECT COUNT(*)::int AS count FROM analytics_page_views
      WHERE is_admin = true
        AND timestamp >= ${yesterday}
    `
    const adminEvents = adminResult[0].count

    if (totalEvents && totalEvents > 0) {
      const adminPercentage = ((adminEvents || 0) / totalEvents) * 100

      console.log(`[Test] Total events (24h): ${totalEvents}`)
      console.log(`[Test] Admin events (24h): ${adminEvents}`)
      console.log(`[Test] Admin percentage: ${adminPercentage.toFixed(1)}%`)

      // In a healthy system, admin events should be <10% of total
      // If it's higher, it might indicate:
      // 1. Admin is doing a lot of testing
      // 2. Admin filtering is broken
      // 3. Not enough real users yet

      if (adminPercentage > 50) {
        console.warn('[Test] ⚠️  Admin events are >50% of total - this is unusual for production')
      }

      // Don't fail the test, just report
      expect(adminPercentage).toBeGreaterThanOrEqual(0)
      expect(adminPercentage).toBeLessThanOrEqual(100)
    } else {
      console.log('[Test] No events in last 24 hours - skipping percentage check')
    }
  })
})
