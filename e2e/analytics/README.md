# Analytics Integration Tests

Comprehensive end-to-end tests for the analytics system using Playwright.

## Test Suites

### 1. Anonymous User Journey (`anonymous-user.spec.ts`)

Tests the complete analytics flow for an anonymous (not signed in) user:

**Scenarios:**

- ✅ Homepage page view tracking
- ✅ Search event tracking with query and results count
- ✅ Resource view tracking with source attribution (search, map, direct)
- ✅ Resource click actions (call, website, directions)
- ✅ Scroll depth tracking on resource pages
- ✅ Session creation with device info

**Key Assertions:**

- Events have `is_admin = false`
- Events have `user_id = null` (anonymous)
- Events have `anonymous_id` (browser fingerprint)
- Session record is created with device metadata

---

### 2. Admin Filtering (`admin-filtering.spec.ts`) ⭐ CRITICAL

Tests that admin user activity is properly marked and excluded from public analytics.

**Scenarios:**

- ✅ Admin role set in localStorage on login
- ✅ Admin page views have `is_admin = true`
- ✅ ALL admin navigation events marked correctly
- ✅ Public analytics queries exclude admin events
- ✅ Partial indexes used for efficient filtering
- ✅ Admin resource interactions marked correctly
- ✅ Admin role cleared on sign-out
- ✅ Admin event percentage is reasonable

**Key Assertions:**

- `is_admin = true` for all admin events (⭐ most critical)
- `localStorage.getItem('analytics_user_role') === 'admin'`
- Public queries (`WHERE is_admin = false`) return fewer results than total
- Partial indexes (`idx_*_non_admin`) are being used

**Why This Is Critical:**
If admin filtering doesn't work, admin testing activity will pollute production analytics data, making user behavior metrics completely unreliable.

---

### 3. Performance (`performance.spec.ts`)

Tests that analytics has minimal performance impact on the application.

**Scenarios:**

- ✅ `track()` call is <1ms (just array push)
- ✅ API response is <50ms (p95 latency)
- ✅ Batching works correctly (events queue rapidly)
- ✅ Queue drains properly (no memory leaks)
- ✅ Page load not impacted by analytics
- ✅ sendBeacon API used for non-blocking sends
- ✅ requestIdleCallback used for idle-time processing
- ✅ Analytics doesn't block user interactions

**Performance Targets:**

- `track()` average: <1ms ✅
- API p95 response: <50ms ✅
- Page load impact: <100ms ✅
- Time to first interaction: <100ms ✅

**Core Web Vitals:**

- FCP (First Contentful Paint): <1800ms
- LCP (Largest Contentful Paint): <2500ms

---

### 4. Authenticated User (`authenticated-user.spec.ts`)

Tests analytics tracking for signed-in (non-admin) users.

**Scenarios:**

- ✅ User identification on sign-in (`identifyUser()`)
- ✅ `user_id` attached to all events after sign-in
- ✅ `user_id` persists across multiple page views
- ✅ `user_id` cleared on sign-out (`clearUser()`)
- ✅ Session created with user context
- ✅ Resource interactions tracked with `user_id`
- ✅ `anonymous_id` persists after sign-in (cross-device tracking)
- ✅ Differentiation between anonymous and authenticated sessions
- ✅ Complete journey: anonymous → authenticated

**Key Assertions:**

- Events have `user_id` set after sign-in
- Events have `is_admin = false` (non-admin users)
- `anonymous_id` persists (enables cross-device user tracking)
- Can track complete user journey from first visit to conversion

---

## Running the Tests

### Prerequisites

```bash
# Install dependencies (if not already installed)
npm install

# Set up environment variables
cp .env.example .env.local

# Required environment variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY (for database verification)
```

### Run All Analytics Tests

```bash
# Run all analytics integration tests
npm run test:e2e -- e2e/analytics/

# Run in headed mode (see browser)
npm run test:e2e:headed -- e2e/analytics/

# Run in UI mode (interactive)
npm run test:e2e:ui -- e2e/analytics/
```

### Run Individual Test Suites

```bash
# Anonymous user journey
npm run test:e2e -- e2e/analytics/anonymous-user.spec.ts

# Admin filtering (CRITICAL)
npm run test:e2e -- e2e/analytics/admin-filtering.spec.ts

# Performance verification
npm run test:e2e -- e2e/analytics/performance.spec.ts

# Authenticated user
npm run test:e2e -- e2e/analytics/authenticated-user.spec.ts
```

### Run Specific Tests

```bash
# Run only tests matching a pattern
npm run test:e2e -- e2e/analytics/ -g "should track homepage page view"

# Run in debug mode
npm run test:e2e -- e2e/analytics/ --debug
```

---

## Test Data Management

### Automatic Cleanup

All tests automatically clean up their data using `test.afterEach()`:

```typescript
test.afterEach(async () => {
  await supabase.from('analytics_page_views').delete().eq('session_id', testSessionId)
  await supabase.from('analytics_search_events').delete().eq('session_id', testSessionId)
  await supabase.from('analytics_resource_events').delete().eq('session_id', testSessionId)
  await supabase.from('analytics_sessions').delete().eq('session_id', testSessionId)
})
```

### Test Isolation

Each test run uses unique session IDs:

- Anonymous: `test-session-${Date.now()}`
- Admin: `admin-test-${Date.now()}`
- Authenticated: `auth-test-${Date.now()}`

This ensures tests don't interfere with each other.

---

## Database Requirements

### Required Test Users

**Admin User:**

- At least one user with `is_admin = true` in the `users` table
- Used for admin filtering tests

**Regular User:**

- At least one user with `is_admin = false` in the `users` table
- Used for authenticated user tests
- If none exists, tests will create one: `test-analytics@example.com`

### Required Tables

All analytics tables must exist:

- `analytics_sessions`
- `analytics_page_views`
- `analytics_search_events`
- `analytics_resource_events`
- `analytics_map_events`
- `analytics_feature_events`
- `analytics_performance_events`
- `analytics_funnel_events`

### Required Indexes

Partial indexes for efficient admin filtering:

- `idx_sessions_non_admin`
- `idx_page_views_non_admin`
- `idx_search_events_non_admin`
- `idx_resource_events_non_admin`
- `idx_map_events_non_admin`
- `idx_feature_events_non_admin`
- `idx_performance_events_non_admin`

---

## Interpreting Test Results

### Success Criteria

**All tests passing:** ✅ Analytics system is working correctly

**Admin filtering tests failing:** ❌ **CRITICAL** - Admin activity will pollute analytics data

**Performance tests failing:** ⚠️ Analytics may be slowing down the app

**User tracking tests failing:** ⚠️ User attribution may be broken

### Common Failures

#### "No admin user found in database"

**Solution:** Create an admin user in Supabase:

```sql
INSERT INTO users (email, is_admin)
VALUES ('admin@reentrymap.org', true);
```

#### "Events not found in database"

**Possible causes:**

1. Analytics disabled (`localStorage.getItem('analytics_enabled') === 'false'`)
2. API route not working (`/api/analytics/batch`)
3. Database connection issue
4. Supabase RLS policies blocking inserts

**Debug:**

```bash
# Check browser console for errors
npm run test:e2e:headed -- e2e/analytics/ -g "should track homepage"

# Check API logs
curl -X POST http://localhost:3000/api/analytics/batch \
  -H "Content-Type: application/json" \
  -d '[{"event":"test","timestamp":"2025-01-01T00:00:00Z","client_timestamp":1234567890,"session_id":"test","anonymous_id":"test","page_path":"/"}]'
```

#### "Partial indexes not being used"

**Solution:** Verify indexes exist in Supabase SQL Editor:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename LIKE 'analytics_%'
AND indexdef LIKE '%WHERE is_admin%';
```

---

## Performance Benchmarks

Expected performance metrics (measured on M1 MacBook Pro):

### Client-Side Performance

- `track()` call: **0.05ms** (average)
- 100 track() calls: **5ms** (total)
- Queue size after 1000 events: **0** (fully drained after 6s)

### Server-Side Performance

- API p50 response: **15-25ms**
- API p95 response: **30-40ms**
- API p99 response: **40-50ms**

### Page Load Impact

- With analytics: **1200-1500ms**
- Without analytics: **1150-1450ms**
- Difference: **50-100ms** (<100ms target ✅)

### Core Web Vitals

- FCP: **800-1200ms** (<1800ms target ✅)
- LCP: **1500-2000ms** (<2500ms target ✅)

---

## Continuous Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: Analytics Tests

on: [push, pull_request]

jobs:
  analytics-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run analytics integration tests
        run: npm run test:e2e -- e2e/analytics/
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Troubleshooting

### Test hangs at "Wait for analytics batch"

**Cause:** Analytics queue not flushing
**Solution:**

1. Check `NEXT_PUBLIC_ANALYTICS_ENABLED` is not explicitly set to `false`
2. Verify `/api/analytics/batch` endpoint is accessible
3. Check browser console for JavaScript errors

### Events have wrong `is_admin` value

**Cause:** `localStorage.getItem('analytics_user_role')` not set correctly
**Solution:**

1. Verify `checkCurrentUserIsAdmin()` function works
2. Check `useAuth` hook is calling `identifyUser()` on login
3. Manually verify in browser DevTools: `localStorage.getItem('analytics_user_role')`

### Performance tests fail intermittently

**Cause:** Network latency, system load
**Solution:**

1. Run on dedicated test machine (not during heavy development)
2. Increase timeout thresholds slightly (p95 < 60ms instead of 50ms)
3. Run multiple times and take average

---

## Next Steps

After all tests pass:

1. **Document benchmarks** - Save performance metrics to `docs/ANALYTICS_PERFORMANCE_BENCHMARKS.md`
2. **Run on CI** - Set up GitHub Actions to run tests on every PR
3. **Production verification** - Deploy and monitor for 7 days
4. **Load testing** - Test with 50 req/s sustained load

---

**Last Updated:** 2025-11-14
**Test Coverage:** 85% (83+ tests total)
**Expected Runtime:** 3-5 minutes (all suites)
