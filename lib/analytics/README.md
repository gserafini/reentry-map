# Analytics System

Privacy-first analytics implementation using Supabase (PostgreSQL) instead of Google Analytics.

## Quick Start

### Basic Tracking

```typescript
import { analytics } from '@/lib/analytics/queue'

// Track page view
analytics.track('page_view', {
  page_title: 'Home - Find Resources',
  load_time_ms: performance.now()
})

// Track search
analytics.track('search', {
  query: 'housing',
  results_count: 15,
  filters: { category: 'housing' }
})

// Track resource interaction
analytics.track('resource_view', {
  resource_id: resource.id,
  source: 'search' // or 'map', 'category', 'favorite', 'direct'
})

// Track map interaction
analytics.track('map_zoom', {
  center_lat: map.getCenter().lat(),
  center_lng: map.getCenter().lng(),
  zoom_level: map.getZoom(),
  visible_markers: 25
})
```

### User Identification

```typescript
import { identifyUser, clearUser } from '@/lib/analytics/queue'

// When user signs in
identifyUser(user.id)

// When user signs out
clearUser()
```

### Admin Filtering

Admin events are automatically excluded from public analytics:

```typescript
// In auth callback after login
if (user.role === 'admin') {
  localStorage.setItem('analytics_user_role', 'admin')
}

// The analytics queue checks this automatically:
// - is_admin flag is set on all events
// - Partial indexes filter WHERE is_admin = false
// - Public analytics dashboard excludes admin activity
```

### Enable/Disable (for testing)

```typescript
import { enableAnalytics, disableAnalytics } from '@/lib/analytics/queue'

// Disable during tests
disableAnalytics()

// Re-enable
enableAnalytics()
```

## Architecture

### Client-side (`lib/analytics/queue.ts`)

- **Zero-impact tracking**: `track()` call < 1ms (just array push)
- **Async batching**: Events queued and sent in batches of 50
- **Idle processing**: Uses `requestIdleCallback` for non-blocking flush
- **Survives navigation**: Uses `sendBeacon` API
- **Privacy-first**: Anonymous IDs, geolocation rounded to ~1km

### Server-side (`app/api/analytics/batch/route.ts`)

- **Fast response**: Returns 202 Accepted immediately (<50ms)
- **Async processing**: Database insertion happens AFTER response
- **Validation**: Zod schemas validate all events before insertion
- **Edge runtime**: Fast cold starts on Vercel
- **Event routing**: Routes events to appropriate tables by type

### Database Schema

8 specialized tables for different event types:

- `analytics_sessions` - Session metadata (device, browser, geo)
- `analytics_page_views` - Page navigation tracking
- `analytics_search_events` - Search queries and results
- `analytics_resource_events` - Resource interactions (view, click, favorite)
- `analytics_map_events` - Map interactions (pan, zoom, markers)
- `analytics_funnel_events` - Conversion funnel tracking
- `analytics_feature_events` - Feature usage tracking
- `analytics_performance_events` - Performance metrics and errors

All tables include:
- `is_admin` flag for filtering admin activity
- `session_id`, `user_id`, `anonymous_id` for user tracking
- `timestamp` for time-based analysis

## Event Types

### Page View

```typescript
analytics.track('page_view', {
  page_title: string
  load_time_ms?: number
})
```

### Search

```typescript
analytics.track('search', {
  query: string
  results_count: number
  filters?: Record<string, string | number | boolean>
  first_click_position?: number
  time_to_first_click_seconds?: number
  refinement_count?: number
})
```

### Resource Interactions

```typescript
// View resource detail
analytics.track('resource_view', {
  resource_id: string (UUID)
  source?: 'search' | 'map' | 'category' | 'favorite' | 'direct'
  time_spent_seconds?: number
  scroll_depth_percent?: number
})

// Click actions
analytics.track('resource_click_call', { resource_id, source })
analytics.track('resource_click_directions', { resource_id, source })
analytics.track('resource_click_website', { resource_id, source })

// Favorites
analytics.track('resource_favorite_add', { resource_id })
analytics.track('resource_favorite_remove', { resource_id })
```

### Map Interactions

```typescript
analytics.track('map_move', {
  center_lat: number (-90 to 90)
  center_lng: number (-180 to 180)
  zoom_level: number (0-22)
  visible_markers?: number
})

analytics.track('map_zoom', { /* same as map_move */ })
analytics.track('map_marker_click', { /* same as map_move */ })
```

### Feature Usage

```typescript
analytics.track('feature_share_button', {
  event_type?: string
  // Any additional metadata
})
```

### Performance

```typescript
analytics.track('performance', {
  metric_name: 'LCP' | 'FCP' | 'TTI' | ...
  metric_value: number (milliseconds)
})

analytics.track('error', {
  error_message: string
  error_stack?: string
})
```

## Testing

### Unit Tests

```bash
# Run all analytics tests
npm test -- __tests__/lib/analytics/

# Run specific test file
npm test -- __tests__/lib/analytics/queue.test.ts
```

### Test Coverage

- **Queue tests** (9 tests): Enable/disable, event tracking, session management
- **Schema tests** (44 tests): All property schemas, edge cases, constraints
- **API tests** (30+ tests): Validation, error handling, event routing

### Mocking in Tests

```typescript
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    clear: () => { store = {} }
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
})

// Similar for sessionStorage, window, navigator, document
```

## Environment Variables

```bash
# Enable/disable analytics (default: true)
NEXT_PUBLIC_ANALYTICS_ENABLED=true

# Can also toggle at runtime in browser console:
# - enableAnalytics()
# - disableAnalytics()
```

## Privacy & Security

### What We Track

- ✅ Page views and navigation
- ✅ Search queries and interactions
- ✅ Resource views and clicks
- ✅ Map interactions
- ✅ Anonymous user IDs
- ✅ Session IDs
- ✅ Device type, browser, OS
- ✅ Geolocation (rounded to ~1km precision)

### What We DON'T Track

- ❌ IP addresses (set to null)
- ❌ Personally Identifiable Information (PII)
- ❌ Admin activity (filtered out via is_admin flag)
- ❌ Fine-grained location data

### Admin Filtering

All analytics queries should filter admin activity:

```sql
-- Public analytics (excludes admin activity)
SELECT COUNT(*)
FROM analytics_page_views
WHERE is_admin = false;

-- Partial indexes optimize these queries:
CREATE INDEX idx_page_views_non_admin
ON analytics_page_views(timestamp DESC)
WHERE is_admin = false;
```

## Performance

### Client-side

- **`track()` call**: < 1ms (just array push)
- **Batching**: 50 events per batch
- **Flush interval**: 5 seconds
- **Idle processing**: Uses `requestIdleCallback`
- **Max batch size**: 1000 events (enforced by Zod schema)

### Server-side

- **API response**: < 50ms (returns 202 immediately)
- **Processing**: Happens AFTER response sent
- **Edge runtime**: Fast cold starts
- **Max duration**: 1 second (enforced by Next.js)

### Database

- **Indexes**: All frequently queried columns
- **Partial indexes**: Optimize `WHERE is_admin = false` queries
- **Composite indexes**: Complex queries (lat/lng, session + timestamp)

## Migration

Database schema changes are in:

```
supabase/migrations/20250110000000_analytics_schema.sql
supabase/migrations/20250114000000_fix_analytics_schema.sql
```

Key changes:
- Added `is_admin` column to all analytics tables
- Fixed column name mismatches (center_lat, event_type)
- Added partial indexes for admin filtering

## Troubleshooting

### Analytics not tracking

1. Check if analytics is enabled:
   ```javascript
   localStorage.getItem('analytics_enabled') // Should be 'true' or null
   ```

2. Check environment variable:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_ANALYTICS_ENABLED)
   ```

3. Check browser console for errors

### Events not appearing in database

1. Check API endpoint is accessible: `/api/analytics/batch`
2. Check validation errors in server logs
3. Verify Supabase connection is working
4. Check RLS policies on analytics tables

### Admin events not filtered

1. Verify `localStorage.getItem('analytics_user_role')` is 'admin'
2. Check database queries use `WHERE is_admin = false`
3. Verify partial indexes exist and are being used (EXPLAIN)

## Further Documentation

- **Strategy**: `docs/ANALYTICS_STRATEGY.md` - Comprehensive analytics strategy and planning
- **API**: `app/api/analytics/batch/route.ts` - Server-side implementation
- **Schemas**: `lib/analytics/schemas.ts` - Zod validation schemas
- **Tests**: `__tests__/lib/analytics/` - Test suite

## Contributing

When adding new event types:

1. Add schema to `lib/analytics/schemas.ts`
2. Add processing function in `app/api/analytics/batch/route.ts`
3. Add database table/columns if needed
4. Add tests for new event type
5. Update this README with usage example
