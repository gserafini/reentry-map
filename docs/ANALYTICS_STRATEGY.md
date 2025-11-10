# Analytics Strategy for Reentry Map

**Version**: 1.0
**Date**: 2025-11-10
**Status**: Proposed

---

## Executive Summary

### Recommendation: Hybrid Approach

**Primary System**: **Custom Supabase-based analytics** (privacy-first, AI-friendly)
**Supplementary**: **Plausible Analytics** (cookieless, GDPR-compliant basic metrics)

### Rationale

1. **Privacy-Critical Population**: Reentry users need maximum privacy protection
2. **AI Analysis Ready**: Direct SQL access enables AI agent queries
3. **Full Control**: Own your data, customize retention, export anytime
4. **Cost-Effective**: Supabase storage + optional Plausible (~$9/mo)
5. **Progressive Enhancement**: Start simple, add complexity as needed

### Quick Comparison

| Feature | Custom (Supabase) | Google Analytics 4 | PostHog | Plausible |
|---------|-------------------|-------------------|---------|-----------|
| Privacy-First | ✅ Excellent | ❌ Poor | ⚠️ Good | ✅ Excellent |
| AI-Friendly | ✅ Direct SQL | ⚠️ BigQuery Export | ✅ SQL Access | ❌ Limited API |
| Cost (10k users/mo) | ~$0 | Free | ~$450/mo | $19/mo |
| Setup Time | 2-3 sessions | 1 hour | 1 hour | 30 min |
| Session Replay | ❌ No | ❌ No | ✅ Yes | ❌ No |
| A/B Testing | Custom | ⚠️ Limited | ✅ Built-in | ❌ No |
| GDPR Compliant | ✅ Yes | ⚠️ With work | ✅ Yes | ✅ Yes |

---

## What to Track

### Core Principle: Track Outcomes, Not Surveillance

Focus on **actionable metrics** that improve user outcomes and UX, not invasive tracking.

### 1. Page View Analytics

**Purpose**: Understand which pages are most valuable

**Data to Collect**:
- Page path (e.g., `/resources`, `/resources/123`)
- Referrer URL (where they came from)
- Session ID (anonymous, browser-generated)
- User ID (if authenticated, hashed for privacy)
- Viewport size (mobile vs desktop vs tablet)
- Page load time (performance monitoring)
- Timestamp

**Why**: Identify most popular resources, drop-off points, slow pages

**Example Query for AI**:
```sql
-- Which resource categories get most traffic?
SELECT
  CASE
    WHEN path LIKE '/resources/category/%' THEN split_part(path, '/', 4)
    ELSE 'other'
  END as category,
  COUNT(*) as views,
  COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_page_views
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 2 DESC;
```

---

### 2. Search Behavior

**Purpose**: Understand what users are looking for (and not finding)

**Data to Collect**:
- Search query (sanitized, remove PII)
- Filters applied (category, distance, hours open)
- Results count
- First result clicked (if any)
- Time to first click
- No-results searches (critical gap indicator)
- Search refinement count (how many times they changed query)

**Why**: Identify content gaps, improve search relevance, understand needs

**Privacy Note**: Hash queries containing phone numbers, emails, names

**Example Query for AI**:
```sql
-- What are users searching for that returns 0 results?
SELECT
  search_query,
  COUNT(*) as search_count,
  AVG(time_to_refinement_seconds) as avg_frustration_time
FROM analytics_search_events
WHERE results_count = 0
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 2 DESC
LIMIT 20;
```

**AI Agent Insight**: "Users searched for 'anger management classes' 47 times in the past week with 0 results. This indicates a content gap in the mental health category."

---

### 3. Resource Interactions

**Purpose**: Measure resource value and user engagement

**Data to Collect**:

**View Events**:
- Resource ID
- User ID (hashed if authenticated)
- Session ID
- Time spent on page (in seconds)
- Scroll depth percentage
- Source (search, map, category, favorite)

**Action Events**:
- Click-to-call (phone number clicked)
- Click-to-directions (Google Maps opened)
- Website visit (external link clicked)
- Favorite added/removed
- Review written
- Share button clicked
- Report problem clicked

**Why**: Identify high-value resources, measure engagement quality

**Example Query for AI**:
```sql
-- Which resources have highest engagement but low ratings?
WITH resource_engagement AS (
  SELECT
    resource_id,
    COUNT(DISTINCT session_id) as unique_views,
    AVG(time_spent_seconds) as avg_time,
    SUM(CASE WHEN event_type = 'click_call' THEN 1 ELSE 0 END) as calls,
    SUM(CASE WHEN event_type = 'click_directions' THEN 1 ELSE 0 END) as directions
  FROM analytics_resource_events
  WHERE timestamp > NOW() - INTERVAL '30 days'
  GROUP BY 1
)
SELECT
  r.name,
  r.primary_category,
  r.rating_average,
  e.unique_views,
  e.avg_time,
  e.calls,
  e.directions
FROM resource_engagement e
JOIN resources r ON r.id = e.resource_id
WHERE e.unique_views > 50
  AND r.rating_average < 3.5
ORDER BY e.unique_views DESC
LIMIT 10;
```

**AI Agent Insight**: "Resource 'Oakland Job Center' has 847 views and 93 calls in 30 days but only 2.8 star rating. This suggests the resource is needed but quality may be poor. Recommend verification agent review."

---

### 4. Map Interactions

**Purpose**: Understand how users navigate geospatially

**Data to Collect**:
- Map zoom level (1-20)
- Map center point (lat/lng, rounded to 2 decimals for privacy)
- View mode (map vs list)
- Marker clicks
- Cluster expansions
- Filter changes while viewing map
- Geolocation permission (granted/denied)

**Why**: Optimize map UX, identify underserved areas

**Privacy Note**: Round coordinates to ~1km precision, never store exact user location

**Example Query for AI**:
```sql
-- What geographic areas are users exploring most?
SELECT
  ROUND(map_center_lat::numeric, 2) as lat_bucket,
  ROUND(map_center_lng::numeric, 2) as lng_bucket,
  COUNT(*) as interactions,
  AVG(zoom_level) as avg_zoom,
  COUNT(DISTINCT session_id) as unique_users
FROM analytics_map_events
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY 1, 2
HAVING COUNT(*) > 10
ORDER BY 3 DESC
LIMIT 20;
```

**AI Agent Insight**: "Users frequently zoom into Richmond area (37.94, -122.35) at zoom level 14+, but we only have 3 resources there. Geographic expansion needed."

---

### 5. Conversion Funnels

**Purpose**: Identify drop-off points in critical user journeys

**Funnels to Track**:

**1. Search → Action Funnel**
- Step 1: Search performed (100%)
- Step 2: Results viewed (% of step 1)
- Step 3: Resource detail opened (% of step 2)
- Step 4: Action taken (call/directions/favorite) (% of step 3)

**2. Sign-Up Funnel**
- Step 1: Clicked "Sign In" (100%)
- Step 2: Entered phone number (% of step 1)
- Step 3: Entered OTP code (% of step 2)
- Step 4: Account created (% of step 3)
- Step 5: First action (favorite/review) (% of step 4)

**3. Review Writing Funnel**
- Step 1: Viewed resource detail (100%)
- Step 2: Clicked "Write Review" (% of step 1)
- Step 3: Started typing review (% of step 2)
- Step 4: Submitted review (% of step 3)

**Data Schema**:
```sql
CREATE TABLE analytics_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_name TEXT NOT NULL, -- 'search-to-action', 'signup', 'review-writing'
  step_name TEXT NOT NULL,   -- 'search', 'view-results', 'open-detail', 'action'
  step_number INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID,              -- NULL if anonymous
  metadata JSONB,            -- Step-specific data
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_events_session ON analytics_funnel_events(funnel_name, session_id, timestamp);
CREATE INDEX idx_funnel_events_analysis ON analytics_funnel_events(funnel_name, step_number, timestamp);
```

**Example Query for AI**:
```sql
-- Calculate conversion rate for search-to-action funnel
WITH funnel_steps AS (
  SELECT
    step_number,
    step_name,
    COUNT(DISTINCT session_id) as sessions
  FROM analytics_funnel_events
  WHERE funnel_name = 'search-to-action'
    AND timestamp > NOW() - INTERVAL '7 days'
  GROUP BY 1, 2
  ORDER BY 1
)
SELECT
  step_name,
  sessions,
  LAG(sessions) OVER (ORDER BY step_number) as previous_step_sessions,
  ROUND(100.0 * sessions / LAG(sessions) OVER (ORDER BY step_number), 2) as conversion_rate
FROM funnel_steps;
```

**AI Agent Insight**: "Search-to-action funnel shows 78% of users view results, but only 23% open a resource detail page. This suggests poor result relevance. Recommend improving search algorithm."

---

### 6. Feature Usage Metrics

**Purpose**: Understand which features are valuable vs ignored

**Features to Track**:
- Favorites page visits
- Filter usage (category, distance, hours, rating)
- Sort preference changes
- Review writing
- Resource suggestions submitted
- Problem reports filed
- Map vs list toggle
- Share button usage
- PWA install rate

**Data Schema**:
```sql
CREATE TABLE analytics_feature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL,    -- 'favorite_toggle', 'filter_category', 'sort_change'
  action TEXT NOT NULL,           -- 'click', 'toggle_on', 'toggle_off', 'submit'
  session_id TEXT NOT NULL,
  user_id UUID,
  metadata JSONB,                 -- Feature-specific data
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_events ON analytics_feature_events(feature_name, timestamp);
```

**Example Query for AI**:
```sql
-- Which filters are most commonly used?
SELECT
  metadata->>'filter_type' as filter_type,
  metadata->>'filter_value' as filter_value,
  COUNT(*) as usage_count,
  COUNT(DISTINCT session_id) as unique_users
FROM analytics_feature_events
WHERE feature_name = 'filter_applied'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY 3 DESC
LIMIT 20;
```

**AI Agent Insight**: "Distance filter is used in 67% of searches, but 'open now' filter only used in 12% of searches. Consider making distance filter more prominent and 'open now' less so."

---

### 7. User Engagement & Retention

**Purpose**: Measure long-term platform value

**Metrics to Track**:

**Session Metrics**:
- Session duration (time between first and last event)
- Pages per session
- Return visit rate (daily, weekly, monthly)
- Time between visits
- First visit source (organic, referral, direct)

**User Cohort Metrics**:
- Day 1 retention (% who return next day)
- Day 7 retention
- Day 30 retention
- Monthly Active Users (MAU)
- Weekly Active Users (WAU)
- Daily Active Users (DAU)
- Stickiness ratio (DAU/MAU)

**Engagement Depth**:
- Power users (10+ sessions/month)
- Active users (3-9 sessions/month)
- Casual users (1-2 sessions/month)
- Churned users (no visit in 30+ days)

**Data Schema**:
```sql
CREATE TABLE analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID,                    -- NULL if anonymous
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  page_views INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,                -- 'mobile', 'tablet', 'desktop'
  browser TEXT,
  os TEXT,
  city TEXT,                       -- IP geolocation, city-level only
  state TEXT,
  country TEXT
);

CREATE INDEX idx_sessions_user ON analytics_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_time ON analytics_sessions(started_at);
```

**Example Query for AI**:
```sql
-- Calculate retention cohorts
WITH first_visits AS (
  SELECT
    user_id,
    DATE(MIN(started_at)) as cohort_date
  FROM analytics_sessions
  WHERE user_id IS NOT NULL
  GROUP BY 1
),
cohort_activity AS (
  SELECT
    f.cohort_date,
    DATE(s.started_at) as activity_date,
    COUNT(DISTINCT s.user_id) as active_users
  FROM first_visits f
  JOIN analytics_sessions s ON s.user_id = f.user_id
  WHERE f.cohort_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY 1, 2
)
SELECT
  cohort_date,
  MAX(CASE WHEN activity_date = cohort_date THEN active_users END) as day_0,
  MAX(CASE WHEN activity_date = cohort_date + 1 THEN active_users END) as day_1,
  MAX(CASE WHEN activity_date = cohort_date + 7 THEN active_users END) as day_7,
  MAX(CASE WHEN activity_date = cohort_date + 30 THEN active_users END) as day_30
FROM cohort_activity
GROUP BY 1
ORDER BY 1 DESC;
```

**AI Agent Insight**: "Users who favorite a resource on Day 1 have 3.2x higher Day 30 retention (47%) vs users who don't (15%). Recommend prompting favorites earlier in onboarding."

---

### 8. Performance Monitoring

**Purpose**: Ensure fast, reliable experience

**Metrics to Track**:
- Page load time (TTFB, FCP, LCP)
- API response times (by endpoint)
- Error rates (by page, by API)
- Failed searches (0 results)
- JavaScript errors (client-side)
- Database query performance (slow queries)

**Data Schema**:
```sql
CREATE TABLE analytics_performance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,        -- 'page_load', 'api_call', 'error'
  page_path TEXT,
  api_endpoint TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  session_id TEXT,
  user_id UUID,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_type ON analytics_performance_events(event_type, timestamp);
CREATE INDEX idx_performance_slow ON analytics_performance_events(duration_ms DESC) WHERE duration_ms > 1000;
```

**Example Query for AI**:
```sql
-- Identify slowest pages in last 24 hours
SELECT
  page_path,
  COUNT(*) as load_count,
  ROUND(AVG(duration_ms)) as avg_load_time,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)) as p95_load_time,
  ROUND(MAX(duration_ms)) as max_load_time
FROM analytics_performance_events
WHERE event_type = 'page_load'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY 1
HAVING COUNT(*) > 10
ORDER BY 3 DESC
LIMIT 10;
```

**AI Agent Insight**: "Resource detail pages with images loading >3 seconds in 95th percentile. Recommend implementing lazy loading or image optimization."

---

### 9. A/B Testing Support

**Purpose**: Make data-driven UX decisions

**Test Examples**:
- "Add to Favorites" button placement (resource card vs detail page)
- Search bar prominence (hero vs header)
- Category filter display (chips vs dropdown)
- Resource card layout (vertical vs horizontal)
- Call-to-action button text ("Get Help" vs "Call Now" vs "Contact")

**Data Schema**:
```sql
CREATE TABLE analytics_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- 'favorite-button-placement'
  hypothesis TEXT,                 -- What we're testing and why
  variants JSONB NOT NULL,         -- [{"name": "control", "weight": 0.5}, {"name": "treatment", "weight": 0.5}]
  success_metric TEXT NOT NULL,    -- 'favorite_click_rate', 'search_to_action_rate'
  status TEXT DEFAULT 'draft',     -- 'draft', 'running', 'paused', 'completed'
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner TEXT,                     -- Variant name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES analytics_experiments(id),
  session_id TEXT NOT NULL,
  user_id UUID,                    -- NULL if anonymous
  variant TEXT NOT NULL,           -- 'control' or 'treatment'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, session_id)
);

CREATE TABLE analytics_experiment_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES analytics_experiments(id),
  assignment_id UUID REFERENCES analytics_experiment_assignments(id),
  session_id TEXT NOT NULL,
  converted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments ON analytics_experiment_assignments(experiment_id, variant);
CREATE INDEX idx_conversions ON analytics_experiment_conversions(experiment_id, assignment_id);
```

**Example Query for AI**:
```sql
-- Calculate A/B test results with statistical significance
WITH experiment_stats AS (
  SELECT
    a.variant,
    COUNT(DISTINCT a.session_id) as total_users,
    COUNT(DISTINCT c.session_id) as converted_users,
    ROUND(100.0 * COUNT(DISTINCT c.session_id) / COUNT(DISTINCT a.session_id), 2) as conversion_rate
  FROM analytics_experiment_assignments a
  LEFT JOIN analytics_experiment_conversions c ON c.assignment_id = a.id
  WHERE a.experiment_id = 'EXPERIMENT_UUID_HERE'
  GROUP BY 1
)
SELECT
  variant,
  total_users,
  converted_users,
  conversion_rate,
  -- Z-score for statistical significance
  CASE
    WHEN variant = 'control' THEN NULL
    ELSE ROUND((conversion_rate - LAG(conversion_rate) OVER (ORDER BY variant)) /
         SQRT((LAG(conversion_rate) OVER (ORDER BY variant) * (100 - LAG(conversion_rate) OVER (ORDER BY variant)) / total_users) +
              (conversion_rate * (100 - conversion_rate) / total_users)), 2)
  END as z_score
FROM experiment_stats
ORDER BY variant;
```

**AI Agent Insight**: "A/B test 'favorite-button-placement' shows treatment variant (button on card) has 12.4% conversion vs control (button on detail) at 8.1%. Z-score of 2.87 indicates statistical significance (p < 0.01). Recommend shipping treatment variant."

---

### 10. Admin & Moderation Metrics

**Purpose**: Track platform health and moderation needs

**Metrics to Track**:
- Resource suggestions submitted (per day)
- Problem reports filed (by type)
- Reviews flagged (spam/inappropriate)
- Agent run frequency and success rate
- Admin actions (approvals, rejections, edits)
- Data quality scores (completeness, freshness)

**Data Schema**:
```sql
CREATE TABLE analytics_admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,        -- 'approve_suggestion', 'reject_review', 'run_agent'
  target_type TEXT,                -- 'resource', 'review', 'suggestion'
  target_id UUID,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_events ON analytics_admin_events(event_type, timestamp);
```

---

## Complete Database Schema

```sql
-- =====================================================
-- ANALYTICS DATABASE SCHEMA
-- Privacy-first, AI-friendly analytics for Reentry Map
-- =====================================================

-- Session tracking (anonymous + authenticated)
CREATE TABLE analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,           -- Browser-generated, persistent in localStorage
  user_id UUID REFERENCES users(id),         -- NULL if anonymous
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  page_views INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,                          -- 'mobile', 'tablet', 'desktop'
  browser TEXT,
  os TEXT,
  city TEXT,                                 -- IP geolocation, city-level only
  state TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON analytics_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_time ON analytics_sessions(started_at);
CREATE INDEX idx_sessions_session_id ON analytics_sessions(session_id);

-- Page view events
CREATE TABLE analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id),
  user_id UUID REFERENCES users(id),
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  load_time_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_views_path ON analytics_page_views(page_path, timestamp);
CREATE INDEX idx_page_views_session ON analytics_page_views(session_id, timestamp);
CREATE INDEX idx_page_views_time ON analytics_page_views(timestamp);

-- Search events
CREATE TABLE analytics_search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id),
  user_id UUID REFERENCES users(id),
  search_query TEXT NOT NULL,                -- Sanitized, PII removed
  filters JSONB,                             -- {category: 'housing', distance: 5, hours: 'open_now'}
  results_count INTEGER NOT NULL,
  first_click_position INTEGER,              -- Which result was clicked (1-indexed)
  time_to_first_click_seconds INTEGER,
  refinement_count INTEGER DEFAULT 0,        -- How many times query was changed
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_query ON analytics_search_events(search_query, timestamp);
CREATE INDEX idx_search_no_results ON analytics_search_events(results_count) WHERE results_count = 0;
CREATE INDEX idx_search_time ON analytics_search_events(timestamp);

-- Resource interaction events
CREATE TABLE analytics_resource_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id),
  user_id UUID REFERENCES users(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  event_type TEXT NOT NULL,                  -- 'view', 'click_call', 'click_directions', 'click_website', 'favorite_add', 'favorite_remove', 'share', 'report'
  time_spent_seconds INTEGER,                -- For 'view' events
  scroll_depth_percent INTEGER,              -- For 'view' events
  source TEXT,                               -- 'search', 'map', 'category', 'favorite', 'direct'
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resource_events_resource ON analytics_resource_events(resource_id, timestamp);
CREATE INDEX idx_resource_events_type ON analytics_resource_events(event_type, timestamp);
CREATE INDEX idx_resource_events_session ON analytics_resource_events(session_id);

-- Map interaction events
CREATE TABLE analytics_map_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,                  -- 'zoom', 'pan', 'marker_click', 'cluster_expand', 'filter_change', 'view_toggle'
  map_center_lat DECIMAL(9,2),               -- Rounded to ~1km precision for privacy
  map_center_lng DECIMAL(9,2),
  zoom_level INTEGER,
  view_mode TEXT,                            -- 'map', 'list'
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_map_events_type ON analytics_map_events(event_type, timestamp);
CREATE INDEX idx_map_events_location ON analytics_map_events(map_center_lat, map_center_lng);

-- Conversion funnel events
CREATE TABLE analytics_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_name TEXT NOT NULL,                 -- 'search-to-action', 'signup', 'review-writing'
  step_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id),
  user_id UUID REFERENCES users(id),
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_events_session ON analytics_funnel_events(funnel_name, session_id, timestamp);
CREATE INDEX idx_funnel_events_analysis ON analytics_funnel_events(funnel_name, step_number, timestamp);

-- Feature usage events
CREATE TABLE analytics_feature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL,                -- 'favorite_toggle', 'filter_category', 'sort_change', 'pwa_install'
  action TEXT NOT NULL,                      -- 'click', 'toggle_on', 'toggle_off', 'submit'
  session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id),
  user_id UUID REFERENCES users(id),
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_events ON analytics_feature_events(feature_name, timestamp);

-- Performance monitoring
CREATE TABLE analytics_performance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,                  -- 'page_load', 'api_call', 'error'
  page_path TEXT,
  api_endpoint TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  session_id TEXT REFERENCES analytics_sessions(session_id),
  user_id UUID REFERENCES users(id),
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_type ON analytics_performance_events(event_type, timestamp);
CREATE INDEX idx_performance_slow ON analytics_performance_events(duration_ms DESC) WHERE duration_ms > 1000;
CREATE INDEX idx_performance_errors ON analytics_performance_events(error_message) WHERE error_message IS NOT NULL;

-- A/B testing experiments
CREATE TABLE analytics_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  hypothesis TEXT,
  variants JSONB NOT NULL,                   -- [{"name": "control", "weight": 0.5}, {"name": "treatment", "weight": 0.5}]
  success_metric TEXT NOT NULL,
  status TEXT DEFAULT 'draft',               -- 'draft', 'running', 'paused', 'completed'
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES analytics_experiments(id),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id),
  user_id UUID REFERENCES users(id),
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, session_id)
);

CREATE TABLE analytics_experiment_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES analytics_experiments(id),
  assignment_id UUID REFERENCES analytics_experiment_assignments(id),
  session_id TEXT NOT NULL,
  converted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments ON analytics_experiment_assignments(experiment_id, variant);
CREATE INDEX idx_conversions ON analytics_experiment_conversions(experiment_id, assignment_id);

-- Admin & moderation events
CREATE TABLE analytics_admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_events ON analytics_admin_events(event_type, timestamp);

-- Daily aggregated metrics (for fast AI queries)
CREATE TABLE analytics_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  metric_name TEXT NOT NULL,                 -- 'page_views', 'unique_sessions', 'avg_session_duration'
  metric_value NUMERIC NOT NULL,
  dimensions JSONB,                          -- {page: '/resources', category: 'housing'}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date, metric_name, dimensions)
);

CREATE INDEX idx_daily_metrics ON analytics_daily_metrics(metric_date DESC, metric_name);

-- Enable Row Level Security
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_resource_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_map_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_feature_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_performance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_experiment_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_admin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin can view all, regular users see nothing
-- Analytics are for internal use only, not user-facing

CREATE POLICY "Admins can view all analytics"
  ON analytics_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- Repeat similar policy for all analytics tables
-- (Omitted for brevity - apply same pattern to all tables)

-- Functions for session management
CREATE OR REPLACE FUNCTION update_session_ended_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE analytics_sessions
  SET
    ended_at = NEW.timestamp,
    events_count = events_count + 1,
    updated_at = NOW()
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update session end time on any event
CREATE TRIGGER update_session_on_page_view
  AFTER INSERT ON analytics_page_views
  FOR EACH ROW
  EXECUTE FUNCTION update_session_ended_at();

CREATE TRIGGER update_session_on_resource_event
  AFTER INSERT ON analytics_resource_events
  FOR EACH ROW
  EXECUTE FUNCTION update_session_ended_at();

-- (Add similar triggers for other event tables)

-- Function to calculate daily metrics (run via cron)
CREATE OR REPLACE FUNCTION calculate_daily_metrics(target_date DATE)
RETURNS void AS $$
BEGIN
  -- Page views by page
  INSERT INTO analytics_daily_metrics (metric_date, metric_name, metric_value, dimensions)
  SELECT
    target_date,
    'page_views',
    COUNT(*),
    jsonb_build_object('page', page_path)
  FROM analytics_page_views
  WHERE DATE(timestamp) = target_date
  GROUP BY page_path
  ON CONFLICT (metric_date, metric_name, dimensions)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;

  -- Unique sessions
  INSERT INTO analytics_daily_metrics (metric_date, metric_name, metric_value, dimensions)
  SELECT
    target_date,
    'unique_sessions',
    COUNT(DISTINCT session_id),
    '{}'::jsonb
  FROM analytics_sessions
  WHERE DATE(started_at) = target_date
  ON CONFLICT (metric_date, metric_name, dimensions)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;

  -- Average session duration
  INSERT INTO analytics_daily_metrics (metric_date, metric_name, metric_value, dimensions)
  SELECT
    target_date,
    'avg_session_duration_seconds',
    AVG(EXTRACT(EPOCH FROM (ended_at - started_at))),
    '{}'::jsonb
  FROM analytics_sessions
  WHERE DATE(started_at) = target_date
    AND ended_at IS NOT NULL
  ON CONFLICT (metric_date, metric_name, dimensions)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;

  -- Top searched queries
  INSERT INTO analytics_daily_metrics (metric_date, metric_name, metric_value, dimensions)
  SELECT
    target_date,
    'search_count',
    COUNT(*),
    jsonb_build_object('query', search_query)
  FROM analytics_search_events
  WHERE DATE(timestamp) = target_date
  GROUP BY search_query
  HAVING COUNT(*) >= 5  -- Only track queries with 5+ searches
  ON CONFLICT (metric_date, metric_name, dimensions)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;

  -- Resource view counts
  INSERT INTO analytics_daily_metrics (metric_date, metric_name, metric_value, dimensions)
  SELECT
    target_date,
    'resource_views',
    COUNT(*),
    jsonb_build_object('resource_id', resource_id::text)
  FROM analytics_resource_events
  WHERE DATE(timestamp) = target_date
    AND event_type = 'view'
  GROUP BY resource_id
  ON CONFLICT (metric_date, metric_name, dimensions)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup old events (retain 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_page_views WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM analytics_search_events WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM analytics_resource_events WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM analytics_map_events WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM analytics_funnel_events WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM analytics_feature_events WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM analytics_performance_events WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM analytics_sessions WHERE started_at < NOW() - INTERVAL '90 days';

  -- Keep daily metrics for 2 years
  DELETE FROM analytics_daily_metrics WHERE metric_date < CURRENT_DATE - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;
```

---

## Privacy & Compliance

### Key Privacy Principles

1. **Data Minimization**: Only collect what's needed
2. **Anonymization**: Use session IDs, not cookies
3. **No PII in Analytics**: Hash/sanitize queries, never store phone numbers, emails, addresses
4. **User Control**: Clear opt-out mechanism
5. **Transparency**: Privacy policy explains what's tracked
6. **Retention Limits**: 90 days for raw events, 2 years for aggregates

### GDPR/CCPA Compliance

**Right to Access**: Users can request their analytics data
**Right to Deletion**: Delete all analytics for a user_id
**Right to Opt-Out**: Respect Do Not Track (DNT) header
**Data Export**: Provide analytics in machine-readable format

**Implementation**:
```sql
-- Delete all analytics for a user (GDPR right to be forgotten)
CREATE OR REPLACE FUNCTION delete_user_analytics(target_user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_page_views WHERE user_id = target_user_id;
  DELETE FROM analytics_search_events WHERE user_id = target_user_id;
  DELETE FROM analytics_resource_events WHERE user_id = target_user_id;
  DELETE FROM analytics_map_events WHERE user_id = target_user_id;
  DELETE FROM analytics_funnel_events WHERE user_id = target_user_id;
  DELETE FROM analytics_feature_events WHERE user_id = target_user_id;
  DELETE FROM analytics_performance_events WHERE user_id = target_user_id;
  DELETE FROM analytics_experiment_assignments WHERE user_id = target_user_id;

  -- Anonymize sessions (keep for aggregate stats)
  UPDATE analytics_sessions SET user_id = NULL WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;
```

### No Cookie Consent Banner Needed

Our approach uses:
- **localStorage for session_id** (not a cookie, no consent required)
- **No third-party tracking** (no Google Analytics cookies)
- **Server-side tracking only** (no client-side cookies)

**Result**: Cleaner UX, no annoying consent banner!

---

## AI Analysis Strategy

### Design Principles

1. **Structured Data**: Use normalized tables, not unstructured logs
2. **Aggregated Views**: Pre-calculate common metrics daily
3. **Clear Schema**: Well-documented table/column names
4. **SQL-Friendly**: AI can write queries without complex JOINs
5. **Metadata in JSONB**: Flexible extension without schema changes

### AI Agent Use Cases

**Weekly Analytics Review Agent**:
```typescript
// lib/ai-agents/analytics-agent.ts
export async function runWeeklyAnalyticsReview() {
  const analysis = await analyzeWith Claude({
    prompt: `You are an analytics expert. Review the following metrics from the past 7 days and provide insights:

    1. Top 10 most viewed resources
    2. Top 10 searches with 0 results (content gaps)
    3. Slowest pages (load time > 3 seconds)
    4. Conversion funnel drop-off points
    5. Feature usage trends (compare to previous week)

    SQL Database: You have access to analytics tables in Supabase.

    Provide:
    - Key insights (3-5 bullet points)
    - Actionable recommendations (prioritized)
    - Red flags (issues requiring immediate attention)
    `,
    tools: [executeSQL],
  })

  // Post to Slack channel, email admins
}
```

**Example AI-Generated Queries**:

```sql
-- AI can write queries like this automatically

-- 1. Identify resources with high bounce rate
SELECT
  r.name,
  r.primary_category,
  COUNT(*) as views,
  AVG(e.time_spent_seconds) as avg_time_spent
FROM analytics_resource_events e
JOIN resources r ON r.id = e.resource_id
WHERE e.event_type = 'view'
  AND e.timestamp > NOW() - INTERVAL '7 days'
  AND e.time_spent_seconds < 10  -- Less than 10 seconds = bounce
GROUP BY 1, 2
HAVING COUNT(*) > 20
ORDER BY 4 ASC;

-- 2. Which search terms lead to most actions?
WITH search_actions AS (
  SELECT
    s.search_query,
    s.session_id,
    COUNT(DISTINCT r.id) FILTER (WHERE r.event_type IN ('click_call', 'click_directions', 'favorite_add')) as actions
  FROM analytics_search_events s
  LEFT JOIN analytics_resource_events r ON r.session_id = s.session_id
    AND r.timestamp > s.timestamp
    AND r.timestamp < s.timestamp + INTERVAL '5 minutes'
  WHERE s.timestamp > NOW() - INTERVAL '30 days'
  GROUP BY 1, 2
)
SELECT
  search_query,
  COUNT(*) as search_count,
  SUM(actions) as total_actions,
  ROUND(100.0 * SUM(actions) / COUNT(*), 2) as action_rate
FROM search_actions
GROUP BY 1
HAVING COUNT(*) >= 10
ORDER BY 4 DESC;

-- 3. User cohort retention analysis
WITH user_cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('week', MIN(created_at)) as cohort_week
  FROM users
  WHERE user_id IS NOT NULL
  GROUP BY 1
),
cohort_activity AS (
  SELECT
    c.cohort_week,
    EXTRACT(WEEK FROM s.started_at) - EXTRACT(WEEK FROM c.cohort_week) as weeks_since_signup,
    COUNT(DISTINCT c.user_id) as active_users
  FROM user_cohorts c
  JOIN analytics_sessions s ON s.user_id = c.user_id
  WHERE c.cohort_week >= CURRENT_DATE - INTERVAL '12 weeks'
  GROUP BY 1, 2
)
SELECT
  cohort_week,
  MAX(CASE WHEN weeks_since_signup = 0 THEN active_users END) as week_0,
  MAX(CASE WHEN weeks_since_signup = 1 THEN active_users END) as week_1,
  MAX(CASE WHEN weeks_since_signup = 4 THEN active_users END) as week_4,
  MAX(CASE WHEN weeks_since_signup = 8 THEN active_users END) as week_8
FROM cohort_activity
GROUP BY 1
ORDER BY 1 DESC;
```

### Pre-Built Views for Common AI Queries

```sql
-- Create materialized views for fast AI queries

CREATE MATERIALIZED VIEW analytics_top_resources_7d AS
SELECT
  r.id,
  r.name,
  r.primary_category,
  COUNT(DISTINCT e.session_id) as unique_views,
  AVG(e.time_spent_seconds) as avg_time_spent,
  SUM(CASE WHEN e.event_type = 'click_call' THEN 1 ELSE 0 END) as calls,
  SUM(CASE WHEN e.event_type = 'click_directions' THEN 1 ELSE 0 END) as directions,
  SUM(CASE WHEN e.event_type = 'favorite_add' THEN 1 ELSE 0 END) as favorites
FROM analytics_resource_events e
JOIN resources r ON r.id = e.resource_id
WHERE e.timestamp > NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3
ORDER BY unique_views DESC;

CREATE MATERIALIZED VIEW analytics_search_gaps_7d AS
SELECT
  search_query,
  COUNT(*) as search_count,
  AVG(time_to_first_click_seconds) as avg_time_to_click,
  COUNT(*) FILTER (WHERE first_click_position IS NULL) as no_click_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE first_click_position IS NULL) / COUNT(*), 2) as no_click_rate
FROM analytics_search_events
WHERE timestamp > NOW() - INTERVAL '7 days'
  AND results_count = 0
GROUP BY 1
ORDER BY 2 DESC;

-- Refresh daily via cron
-- SELECT refresh_materialized_view_concurrently('analytics_top_resources_7d');
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Goal**: Basic page view and session tracking

**Tasks**:
1. Create analytics database schema
2. Implement session tracking utility (`lib/utils/analytics.ts`)
3. Add page view tracking to `app/layout.tsx`
4. Create admin analytics dashboard (`/admin/analytics`)
5. Test with Playwright

**Deliverables**:
- Page views tracked
- Session duration calculated
- Admin can view basic metrics

**Effort**: 1 session (~4 hours)

---

### Phase 2: Core Events (Week 2)

**Goal**: Track search, resource interactions, map events

**Tasks**:
1. Add search event tracking to SearchBar component
2. Add resource event tracking to ResourceDetail page
3. Add map event tracking to Map component
4. Add funnel tracking to key user journeys
5. Create analytics API endpoints for data ingestion

**Deliverables**:
- Search analytics working
- Resource view/click tracking working
- Map interaction tracking working
- Funnels visible in admin dashboard

**Effort**: 2 sessions (~8 hours)

---

### Phase 3: Performance & Errors (Week 3)

**Goal**: Monitor app health and performance

**Tasks**:
1. Add client-side error tracking
2. Add API performance monitoring
3. Add page load performance tracking
4. Create alerts for slow pages/errors
5. Build performance dashboard

**Deliverables**:
- Performance metrics tracked
- Error logging working
- Admin alerts for issues

**Effort**: 1 session (~4 hours)

---

### Phase 4: AI Analysis (Week 4)

**Goal**: Enable AI agent to analyze analytics

**Tasks**:
1. Create daily aggregation cron job
2. Build AI analytics agent (`lib/ai-agents/analytics-agent.ts`)
3. Create pre-built SQL views for common queries
4. Test AI agent weekly review
5. Set up Slack/email notifications

**Deliverables**:
- Daily metrics aggregated
- AI agent provides weekly insights
- Automated reporting working

**Effort**: 2 sessions (~8 hours)

---

### Phase 5: A/B Testing (Week 5)

**Goal**: Data-driven UX optimization

**Tasks**:
1. Create A/B test framework
2. Implement variant assignment logic
3. Build experiment dashboard
4. Run first test (favorite button placement)
5. Calculate statistical significance

**Deliverables**:
- A/B testing framework working
- First experiment running
- Results visible in admin dashboard

**Effort**: 2 sessions (~8 hours)

---

### Phase 6: Polish & Launch (Week 6)

**Goal**: Production-ready analytics

**Tasks**:
1. Add privacy policy section on analytics
2. Implement opt-out mechanism
3. Set up automated cleanup (90-day retention)
4. Add data export for users (GDPR)
5. Performance optimization (indexes, caching)
6. Documentation for admins

**Deliverables**:
- GDPR/CCPA compliant
- Automated maintenance working
- Admin documentation complete

**Effort**: 1 session (~4 hours)

---

## Cost Estimate

### Custom Analytics (Supabase)

**Database Storage**:
- Assumptions: 10,000 sessions/month, 50,000 events/month
- Storage: ~500MB/year after compression
- Cost: **$0** (within Supabase free tier 500MB)

**Compute**:
- Minimal impact on existing database
- Cost: **$0** (no additional compute)

**Total**: **$0/month** for first year

### Optional: Plausible Analytics

**Cost**: $9/month for 10k page views, $19/month for 100k

**Use Case**: Supplementary dashboard for non-technical stakeholders

**Total**: **$9-19/month** (optional)

### Total Cost: $0-19/month

Compare to:
- **Google Analytics**: Free but privacy concerns
- **PostHog Cloud**: $450/month for 10k users
- **Mixpanel**: $300/month for 10k MTUs

---

## Metrics That Matter Most

### North Star Metric

**Resources Accessed** (click-to-call + click-to-directions + website visits)

**Why**: Directly measures whether users are taking action to get help

---

### Key Performance Indicators (KPIs)

1. **Weekly Active Users (WAU)**: Unique users per week
2. **Resources Accessed**: Total actions taken per week
3. **Search Success Rate**: % of searches leading to resource view
4. **Conversion Rate**: % of resource views leading to action
5. **Day 7 Retention**: % of new users returning after 7 days

---

### Secondary Metrics

- Average session duration
- Pages per session
- Favorite rate (% of users who favorite 1+ resource)
- Review rate (% of users who write 1+ review)
- PWA install rate
- Page load time (p95)
- Error rate

---

## Questions for AI Agent to Answer

**Weekly Review Questions**:
1. What are the top 5 most accessed resources this week?
2. Which searches returned 0 results? (content gaps)
3. Which pages are slowest to load?
4. What % of searches lead to a phone call or directions?
5. Are there any resources with high views but low ratings?
6. Which features are most/least used?
7. What's our Week 7 retention rate for new users?
8. Are there any error spikes or performance issues?

**Monthly Review Questions**:
1. What's our monthly growth rate (MAU)?
2. Which categories are growing fastest?
3. What's our best-performing user acquisition channel?
4. Which A/B tests should we run next based on data?
5. What geographic areas have high demand but low resource count?
6. Which resources should we verify/update based on low engagement?
7. What's our overall conversion funnel health?

---

## Automatic Tracking Implementation

### Design Principle: Zero-Touch Analytics

**Goal**: Add a button, get analytics automatically. No manual tracking code required.

### Core Strategy: Data Attributes + Global Listeners

Instead of adding tracking code everywhere:

```typescript
// ❌ BAD: Manual tracking everywhere
<Button onClick={() => {
  trackEvent('click_call', { resource_id: id })
  handleCall()
}}>
  Call
</Button>

// ✅ GOOD: Automatic tracking via data attributes
<Button
  data-analytics="click_call"
  data-resource-id={id}
  onClick={handleCall}
>
  Call
</Button>
```

The global listener handles all tracking automatically.

---

### 1. Global Click Listener (Auto-Track All Clicks)

**Implementation** (`lib/utils/analytics-tracker.ts`):

```typescript
'use client'

import { useEffect } from 'react'
import { trackEvent } from './analytics'

export function AnalyticsTracker() {
  useEffect(() => {
    // Global click listener
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const trackingElement = target.closest('[data-analytics]')

      if (!trackingElement) return

      const eventType = trackingElement.getAttribute('data-analytics')
      if (!eventType) return

      // Collect all data-* attributes as metadata
      const metadata: Record<string, any> = {}
      Array.from(trackingElement.attributes).forEach((attr) => {
        if (attr.name.startsWith('data-') && attr.name !== 'data-analytics') {
          const key = attr.name.replace('data-', '').replace(/-/g, '_')
          metadata[key] = attr.value
        }
      })

      // Auto-detect resource context
      if (!metadata.resource_id) {
        const resourceContext = target.closest('[data-resource-id]')
        if (resourceContext) {
          metadata.resource_id = resourceContext.getAttribute('data-resource-id')
        }
      }

      // Track the event
      trackEvent(eventType, metadata)
    }

    // Attach global listener
    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  return null
}
```

**Usage in Layout**:

```typescript
// app/layout.tsx
import { AnalyticsTracker } from '@/lib/utils/analytics-tracker'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  )
}
```

**Result**: Every element with `data-analytics` is automatically tracked!

---

### 2. Automatic Page View Tracking

**Implementation** (`lib/utils/analytics.ts`):

```typescript
'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    trackPageView({
      path: pathname,
      search: searchParams.toString(),
      title: document.title,
      referrer: document.referrer,
    })
  }, [pathname, searchParams])

  return null
}
```

**No manual tracking needed** - automatically tracks all page navigation!

---

### 3. Automatic Form Submission Tracking

**Implementation**:

```typescript
// Auto-track form submissions
useEffect(() => {
  const handleSubmit = (e: Event) => {
    const form = e.target as HTMLFormElement
    const formName = form.getAttribute('data-form-name') || form.name || 'unnamed'

    trackEvent('form_submit', {
      form_name: formName,
      action: form.action,
    })
  }

  document.addEventListener('submit', handleSubmit, true)
  return () => document.removeEventListener('submit', handleSubmit, true)
}, [])
```

**Usage**:

```typescript
// Automatically tracked, no onClick needed
<form data-form-name="resource-suggestion">
  <input name="name" />
  <button type="submit">Submit</button>
</form>
```

---

### 4. Automatic Error Tracking

**Implementation** (`app/error-boundary.tsx`):

```typescript
'use client'

import { useEffect } from 'react'
import { trackError } from '@/lib/utils/analytics'

export function ErrorBoundary({ error }: { error: Error }) {
  useEffect(() => {
    trackError({
      message: error.message,
      stack: error.stack,
      page: window.location.pathname,
    })
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => window.location.reload()}>Try again</button>
    </div>
  )
}
```

**All errors automatically tracked** - no try/catch needed!

---

### 5. Automatic Search Tracking

**Implementation** (`components/search/SearchBar.tsx`):

```typescript
'use client'

import { useCallback } from 'react'
import { trackSearch } from '@/lib/utils/analytics'
import { debounce } from '@/lib/utils'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})

  // Auto-track search when query changes (debounced)
  const trackSearchEvent = useCallback(
    debounce((query: string, filters: object, resultsCount: number) => {
      trackSearch({
        query,
        filters,
        results_count: resultsCount,
      })
    }, 500),
    []
  )

  const handleSearch = async (q: string) => {
    setQuery(q)
    const results = await fetchResults(q, filters)

    // Automatically track search
    trackSearchEvent(q, filters, results.length)

    return results
  }

  return <input value={query} onChange={(e) => handleSearch(e.target.value)} />
}
```

**Search automatically tracked** when user types!

---

### 6. Automatic Resource Interaction Tracking

**Pattern**: Wrap resource components in a tracking provider

```typescript
// components/resources/ResourceCard.tsx
<ResourceTrackingProvider resourceId={resource.id} source="search">
  <Card data-resource-id={resource.id}>
    <h3>{resource.name}</h3>

    {/* Auto-tracked via data-analytics */}
    <Button
      data-analytics="click_call"
      href={`tel:${resource.phone}`}
    >
      Call
    </Button>

    <Button
      data-analytics="click_directions"
      href={mapsUrl}
    >
      Directions
    </Button>

    <Button
      data-analytics="click_website"
      href={resource.website}
      target="_blank"
    >
      Visit Website
    </Button>

    <FavoriteButton
      data-analytics="favorite_toggle"
      resourceId={resource.id}
    />
  </Card>
</ResourceTrackingProvider>
```

**ResourceTrackingProvider** automatically adds context to all child events!

---

### 7. Smart Defaults with Convention Over Configuration

**Naming Conventions**:

```typescript
// Auto-detect event type from button text/icon
<Button> {/* No data-analytics needed */}
  <PhoneIcon /> Call
</Button>
// → Automatically tracked as 'click_call'

<Button>
  <DirectionsIcon /> Get Directions
</Button>
// → Automatically tracked as 'click_directions'

<Button>
  <HeartIcon /> {isFavorited ? 'Unfavorite' : 'Favorite'}
</Button>
// → Automatically tracked as 'favorite_toggle'
```

**Implementation**:

```typescript
function inferEventType(element: HTMLElement): string | null {
  const text = element.textContent?.toLowerCase() || ''

  if (text.includes('call') || element.querySelector('[data-icon="phone"]')) {
    return 'click_call'
  }
  if (text.includes('direction') || element.querySelector('[data-icon="directions"]')) {
    return 'click_directions'
  }
  if (text.includes('favorite') || element.querySelector('[data-icon="heart"]')) {
    return 'favorite_toggle'
  }
  if (text.includes('share')) {
    return 'click_share'
  }

  return null
}
```

---

### 8. Automatic Performance Tracking

**Web Vitals Integration**:

```typescript
// lib/utils/analytics-performance.ts
'use client'

import { useEffect } from 'react'
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

export function PerformanceTracker() {
  useEffect(() => {
    onCLS((metric) => trackPerformance('CLS', metric.value))
    onFID((metric) => trackPerformance('FID', metric.value))
    onFCP((metric) => trackPerformance('FCP', metric.value))
    onLCP((metric) => trackPerformance('LCP', metric.value))
    onTTFB((metric) => trackPerformance('TTFB', metric.value))
  }, [])

  return null
}
```

**All Core Web Vitals automatically tracked!**

---

### 9. Automatic API Call Tracking

**Middleware Pattern**:

```typescript
// lib/utils/api-client.ts
async function apiCall(endpoint: string, options?: RequestInit) {
  const startTime = performance.now()

  try {
    const response = await fetch(endpoint, options)
    const duration = performance.now() - startTime

    // Auto-track API performance
    trackPerformance('api_call', {
      endpoint,
      duration_ms: Math.round(duration),
      status: response.status,
      method: options?.method || 'GET',
    })

    return response
  } catch (error) {
    const duration = performance.now() - startTime

    // Auto-track API errors
    trackError({
      type: 'api_error',
      endpoint,
      duration_ms: Math.round(duration),
      error: error.message,
    })

    throw error
  }
}
```

**All API calls automatically tracked** - no manual instrumentation!

---

### 10. Development Helper: Auto-Track Missing Events

**Dev Mode Only**: Warn when clickable elements lack tracking

```typescript
// lib/utils/analytics-dev-helper.ts (dev mode only)
if (process.env.NODE_ENV === 'development') {
  useEffect(() => {
    const warnUntracked = () => {
      const clickables = document.querySelectorAll('button, a, [role="button"]')

      clickables.forEach((el) => {
        const hasTracking = el.closest('[data-analytics]')
        const isSystemButton = el.closest('[data-system]') // Ignore system buttons

        if (!hasTracking && !isSystemButton) {
          console.warn(
            'Untracked clickable element:',
            el,
            '\nAdd data-analytics attribute for tracking'
          )
        }
      })
    }

    // Run check after 2 seconds (let page settle)
    const timeout = setTimeout(warnUntracked, 2000)
    return () => clearTimeout(timeout)
  }, [])
}
```

**Developers get warnings** when they forget to add tracking!

---

### Complete Example: Resource Card (Fully Automatic)

```typescript
// components/resources/ResourceCard.tsx
'use client'

import { Card, Button } from '@/components/ui'
import { PhoneIcon, DirectionsIcon, HeartIcon } from '@/components/icons'

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Card
      data-resource-id={resource.id}
      data-analytics="resource_view"
    >
      <h3>{resource.name}</h3>
      <p>{resource.description}</p>

      {/* All buttons automatically tracked via global listener */}
      <div className="actions">
        <Button
          data-analytics="click_call"
          href={`tel:${resource.phone}`}
        >
          <PhoneIcon /> Call
        </Button>

        <Button
          data-analytics="click_directions"
          href={getDirectionsUrl(resource)}
          target="_blank"
        >
          <DirectionsIcon /> Directions
        </Button>

        <Button
          data-analytics="click_website"
          href={resource.website}
          target="_blank"
        >
          Visit Website
        </Button>

        <FavoriteButton
          data-analytics="favorite_toggle"
          resourceId={resource.id}
        />
      </div>
    </Card>
  )
}
```

**Zero manual tracking code** - all handled by global listeners!

---

### Summary: What's Automatic vs Manual

| Event Type | Automatic? | Implementation |
|------------|-----------|----------------|
| Page views | ✅ Yes | Router listener |
| Button clicks | ✅ Yes | Global listener + data attributes |
| Form submits | ✅ Yes | Global submit listener |
| Errors | ✅ Yes | Error boundary |
| Performance | ✅ Yes | Web Vitals integration |
| API calls | ✅ Yes | Fetch middleware |
| Search | ⚠️ Semi | Auto-triggered on query change |
| Funnels | ❌ Manual | Explicit funnel step tracking |
| Custom events | ❌ Manual | Call `trackEvent()` directly |

**Result**: ~90% of tracking is automatic, ~10% requires manual calls for complex workflows

---

### Best Practices

1. **Always add data-analytics** to interactive elements
2. **Use semantic names** (`click_call`, not `button_1`)
3. **Include context** via `data-resource-id`, `data-category`, etc.
4. **Test in dev mode** with analytics helper warnings
5. **Review analytics dashboard** weekly to ensure events are firing

---

### Migration Strategy

**Existing Code**: Add data attributes gradually

```typescript
// Before
<Button onClick={handleClick}>Call</Button>

// After (no code change, just attribute)
<Button onClick={handleClick} data-analytics="click_call">Call</Button>
```

**New Code**: Use data attributes from the start

---

---

## Unique User Tracking

### Challenge: Identifying Unique Users Across Sessions

**Problem**: How do we count unique users when they're anonymous and may visit multiple times?

**Solution**: Multi-layered identification strategy

---

### 1. Identification Hierarchy

**Priority Order** (most to least reliable):

1. **Authenticated User ID** (logged-in users)
   - Most accurate, persistent across devices
   - Respects privacy (user consented by signing up)

2. **Persistent Anonymous ID** (localStorage)
   - Browser-specific, survives page refreshes
   - Cleared when user clears browser data
   - Privacy-friendly (no cookies)

3. **Session ID** (current session only)
   - Fallback if localStorage unavailable
   - Cleared on browser close

---

### 2. Implementation: Anonymous User ID

**localStorage-based persistent ID** (`lib/utils/analytics-user-id.ts`):

```typescript
'use client'

import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'reentry-map-user-id'

/**
 * Get or create persistent anonymous user ID
 * Survives page refreshes but respects privacy (no cookies, no fingerprinting)
 */
export function getAnonymousUserId(): string {
  try {
    // Check if ID already exists
    let userId = localStorage.getItem(STORAGE_KEY)

    if (!userId) {
      // Generate new UUID
      userId = uuidv4()
      localStorage.setItem(STORAGE_KEY, userId)
    }

    return userId
  } catch (error) {
    // localStorage unavailable (private browsing, storage full, etc.)
    // Generate temporary ID for this session only
    if (!globalThis.__tempUserId) {
      globalThis.__tempUserId = uuidv4()
    }
    return globalThis.__tempUserId
  }
}

/**
 * Get user ID (authenticated user_id or anonymous ID)
 */
export function getUserId(authenticatedUserId?: string): string {
  if (authenticatedUserId) {
    return authenticatedUserId
  }
  return getAnonymousUserId()
}

/**
 * Clear anonymous ID (e.g., user signs out or requests data deletion)
 */
export function clearAnonymousUserId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    delete globalThis.__tempUserId
  } catch (error) {
    // Ignore errors
  }
}
```

**Usage in Analytics Tracker**:

```typescript
// lib/utils/analytics.ts
import { getAnonymousUserId, getUserId } from './analytics-user-id'
import { useAuth } from './auth' // Your auth hook

export function trackEvent(eventName: string, metadata?: object) {
  const { user } = useAuth() // Get authenticated user if signed in
  const userId = getUserId(user?.id)
  const anonymousId = user?.id ? null : getAnonymousUserId()

  // Send event to database
  supabase.from('analytics_events').insert({
    event_name: eventName,
    user_id: userId,
    anonymous_id: anonymousId,
    metadata,
    timestamp: new Date().toISOString(),
  })
}
```

---

### 3. Database Schema Updates

Add `anonymous_id` to track persistent anonymous users:

```sql
-- Add anonymous_id to sessions table
ALTER TABLE analytics_sessions
ADD COLUMN anonymous_id TEXT;

CREATE INDEX idx_sessions_anonymous ON analytics_sessions(anonymous_id, started_at DESC);

-- Add to all event tables
ALTER TABLE analytics_page_views ADD COLUMN anonymous_id TEXT;
ALTER TABLE analytics_search_events ADD COLUMN anonymous_id TEXT;
ALTER TABLE analytics_resource_events ADD COLUMN anonymous_id TEXT;
ALTER TABLE analytics_map_events ADD COLUMN anonymous_id TEXT;
ALTER TABLE analytics_funnel_events ADD COLUMN anonymous_id TEXT;
ALTER TABLE analytics_feature_events ADD COLUMN anonymous_id TEXT;
```

---

### 4. Unique User Queries

**Daily/Weekly/Monthly Unique Users**:

```sql
-- Daily Active Users (DAU)
SELECT
  DATE(timestamp) as date,
  COUNT(DISTINCT COALESCE(user_id, anonymous_id)) as unique_users
FROM analytics_page_views
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- Weekly Active Users (WAU)
SELECT
  DATE_TRUNC('week', timestamp) as week,
  COUNT(DISTINCT COALESCE(user_id, anonymous_id)) as unique_users
FROM analytics_page_views
WHERE timestamp > NOW() - INTERVAL '12 weeks'
GROUP BY 1
ORDER BY 1 DESC;

-- Monthly Active Users (MAU)
SELECT
  DATE_TRUNC('month', timestamp) as month,
  COUNT(DISTINCT COALESCE(user_id, anonymous_id)) as unique_users
FROM analytics_page_views
WHERE timestamp > NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1 DESC;
```

**New vs Returning Users**:

```sql
WITH first_visit AS (
  SELECT
    COALESCE(user_id, anonymous_id) as unique_id,
    MIN(timestamp) as first_seen
  FROM analytics_sessions
  GROUP BY 1
)
SELECT
  DATE(s.started_at) as date,
  COUNT(DISTINCT s.session_id) FILTER (
    WHERE DATE(f.first_seen) = DATE(s.started_at)
  ) as new_users,
  COUNT(DISTINCT s.session_id) FILTER (
    WHERE DATE(f.first_seen) < DATE(s.started_at)
  ) as returning_users
FROM analytics_sessions s
JOIN first_visit f ON f.unique_id = COALESCE(s.user_id, s.anonymous_id)
WHERE s.started_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

---

### 5. Handling User Sign-In/Sign-Out

**Merge Anonymous → Authenticated**:

When a user signs in, link their anonymous session history to their user account:

```typescript
// lib/utils/analytics-merge.ts
export async function mergeAnonymousToAuthenticated(
  authenticatedUserId: string
) {
  const anonymousId = getAnonymousUserId()

  if (!anonymousId) return

  // Update all analytics tables to link anonymous_id to user_id
  await supabase.rpc('merge_anonymous_user', {
    anonymous_id: anonymousId,
    authenticated_user_id: authenticatedUserId,
  })

  // Clear anonymous ID (now using authenticated user_id)
  clearAnonymousUserId()
}
```

**Database Function**:

```sql
CREATE OR REPLACE FUNCTION merge_anonymous_user(
  anonymous_id TEXT,
  authenticated_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Update sessions
  UPDATE analytics_sessions
  SET user_id = authenticated_user_id
  WHERE anonymous_id = merge_anonymous_user.anonymous_id;

  -- Update all event tables
  UPDATE analytics_page_views
  SET user_id = authenticated_user_id
  WHERE anonymous_id = merge_anonymous_user.anonymous_id;

  UPDATE analytics_search_events
  SET user_id = authenticated_user_id
  WHERE anonymous_id = merge_anonymous_user.anonymous_id;

  UPDATE analytics_resource_events
  SET user_id = authenticated_user_id
  WHERE anonymous_id = merge_anonymous_user.anonymous_id;

  -- (Repeat for other event tables)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Call on Sign-In**:

```typescript
// After successful authentication
async function handleSignIn(user: User) {
  // Merge anonymous history to authenticated user
  await mergeAnonymousToAuthenticated(user.id)

  // Continue with normal sign-in flow
}
```

---

### 6. Privacy Considerations

**Advantages of localStorage over Cookies**:
- ✅ No cookie consent banner needed (not a tracking cookie)
- ✅ Not sent with every HTTP request (better performance)
- ✅ Easier to clear (user can clear site data)
- ✅ Not shared across domains (more private)

**User Control**:
- Clear explanation in privacy policy
- "Delete my data" button in settings
- Respect "Do Not Track" browser setting
- Private browsing mode: generate temporary ID only

```typescript
// Respect Do Not Track
export function shouldTrackAnalytics(): boolean {
  if (navigator.doNotTrack === '1') {
    return false // Respect DNT
  }
  return true
}
```

---

## Real-Time Visitor Map

### Goal: Show Active Users on Map (Like Google Analytics)

**Features**:
- See how many users are online right now
- Geographic distribution (city-level)
- Current page they're viewing
- Real-time updates (WebSocket)
- Auto-expire after 5 minutes of inactivity

---

### 1. Database Schema: Active Sessions

```sql
-- Table for currently active sessions (ephemeral, cleared frequently)
CREATE TABLE analytics_active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  current_page TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  lat DECIMAL(9,2),  -- Rounded to ~1km precision
  lng DECIMAL(9,2),
  device_type TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_active_sessions_last_activity ON analytics_active_sessions(last_activity DESC);
CREATE INDEX idx_active_sessions_location ON analytics_active_sessions(lat, lng) WHERE lat IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE analytics_active_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can view active sessions
CREATE POLICY "Admins can view active sessions"
  ON analytics_active_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- Function to clean up stale sessions (inactive > 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_active_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_active_sessions
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;
```

---

### 2. Client-Side: Heartbeat Tracking

**Send heartbeat every 30 seconds** to mark session as active:

```typescript
// lib/utils/analytics-heartbeat.ts
'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getSessionId } from './analytics-session'
import { getUserId } from './analytics-user-id'
import { getLocationData } from './analytics-location'

const HEARTBEAT_INTERVAL = 30000 // 30 seconds

export function AnalyticsHeartbeat() {
  const pathname = usePathname()
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Send initial heartbeat
    sendHeartbeat(pathname)

    // Set up interval
    intervalRef.current = setInterval(() => {
      sendHeartbeat(pathname)
    }, HEARTBEAT_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [pathname])

  return null
}

async function sendHeartbeat(currentPage: string) {
  const sessionId = getSessionId()
  const userId = getUserId()
  const location = await getLocationData()

  // Upsert to analytics_active_sessions
  await fetch('/api/analytics/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      user_id: userId,
      current_page: currentPage,
      city: location.city,
      state: location.state,
      country: location.country,
      lat: location.lat,
      lng: location.lng,
      device_type: getDeviceType(),
    }),
  })
}

function getDeviceType(): string {
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}
```

**Add to Layout**:

```typescript
// app/layout.tsx
import { AnalyticsHeartbeat } from '@/lib/utils/analytics-heartbeat'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsHeartbeat />
        {children}
      </body>
    </html>
  )
}
```

---

### 3. API Endpoint: Heartbeat

```typescript
// app/api/analytics/heartbeat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // Upsert active session (update if exists, insert if new)
    await supabase
      .from('analytics_active_sessions')
      .upsert(
        {
          session_id: body.session_id,
          user_id: body.user_id || null,
          anonymous_id: body.anonymous_id || null,
          current_page: body.current_page,
          city: body.city,
          state: body.state,
          country: body.country,
          lat: body.lat,
          lng: body.lng,
          device_type: body.device_type,
          last_activity: new Date().toISOString(),
        },
        {
          onConflict: 'session_id',
        }
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: 'Failed to record heartbeat' }, { status: 500 })
  }
}
```

---

### 4. Admin Dashboard: Real-Time Map

**Component** (`components/admin/RealTimeMap.tsx`):

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'

interface ActiveSession {
  id: string
  session_id: string
  current_page: string
  city: string
  state: string
  lat: number
  lng: number
  device_type: string
  last_activity: string
}

export function RealTimeMap() {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [selectedMarker, setSelectedMarker] = useState<ActiveSession | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    fetchActiveSessions()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('active-sessions')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'analytics_active_sessions',
        },
        () => {
          // Refetch when any change occurs
          fetchActiveSessions()
        }
      )
      .subscribe()

    // Refresh every 30 seconds (in case real-time fails)
    const interval = setInterval(fetchActiveSessions, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  async function fetchActiveSessions() {
    const { data, error } = await supabase
      .from('analytics_active_sessions')
      .select('*')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Active in last 5 min

    if (data) {
      setActiveSessions(data)
    }
  }

  const mapCenter = {
    lat: 37.8044, // Oakland, CA (default)
    lng: -122.2711,
  }

  return (
    <div className="h-screen w-full">
      <div className="bg-white p-4 shadow">
        <h2 className="text-xl font-bold">Real-Time Visitors</h2>
        <p className="text-gray-600">
          <span className="text-2xl font-bold text-green-600">
            {activeSessions.length}
          </span>{' '}
          active users right now
        </p>
      </div>

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: 'calc(100% - 80px)' }}
        center={mapCenter}
        zoom={8}
      >
        {activeSessions.map((session) => (
          <Marker
            key={session.id}
            position={{ lat: session.lat, lng: session.lng }}
            onClick={() => setSelectedMarker(session)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#10b981', // Green
              fillOpacity: 0.8,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
          />
        ))}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2">
              <p className="font-bold">{selectedMarker.city}, {selectedMarker.state}</p>
              <p className="text-sm text-gray-600">
                Page: {selectedMarker.current_page}
              </p>
              <p className="text-sm text-gray-600">
                Device: {selectedMarker.device_type}
              </p>
              <p className="text-xs text-gray-400">
                Last active: {new Date(selectedMarker.last_activity).toLocaleTimeString()}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
```

**Admin Page** (`app/admin/analytics/realtime/page.tsx`):

```typescript
import { RealTimeMap } from '@/components/admin/RealTimeMap'
import { requireAdmin } from '@/lib/utils/admin'

export default async function RealTimeAnalyticsPage() {
  await requireAdmin() // Ensure only admins can access

  return (
    <div className="h-screen">
      <RealTimeMap />
    </div>
  )
}
```

---

### 5. Geographic Data: IP Geolocation

**Option 1: Vercel IP Geolocation** (Built-in, Free)

```typescript
// lib/utils/analytics-location.ts
import { NextRequest } from 'next/server'

export function getLocationFromRequest(request: NextRequest) {
  // Vercel automatically adds geo headers
  const city = request.geo?.city || null
  const state = request.geo?.region || null
  const country = request.geo?.country || null
  const lat = request.geo?.latitude || null
  const lng = request.geo?.longitude || null

  // Round coordinates to ~1km precision for privacy
  return {
    city,
    state,
    country,
    lat: lat ? Math.round(lat * 100) / 100 : null,
    lng: lng ? Math.round(lng * 100) / 100 : null,
  }
}
```

**Option 2: MaxMind GeoLite2** (More accurate, requires setup)

```typescript
import maxmind, { CityResponse } from 'maxmind'

let geoLookup: maxmind.Reader<CityResponse> | null = null

async function getGeoLookup() {
  if (!geoLookup) {
    geoLookup = await maxmind.open<CityResponse>('./data/GeoLite2-City.mmdb')
  }
  return geoLookup
}

export async function getLocationFromIP(ip: string) {
  const lookup = await getGeoLookup()
  const result = lookup.get(ip)

  if (!result) return null

  return {
    city: result.city?.names.en || null,
    state: result.subdivisions?.[0]?.names.en || null,
    country: result.country?.names.en || null,
    lat: result.location?.latitude || null,
    lng: result.location?.longitude || null,
  }
}
```

---

### 6. Real-Time Stats Widget

**Simple stats without map**:

```typescript
// components/admin/RealTimeStats.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealTimeStats() {
  const [stats, setStats] = useState({
    activeUsers: 0,
    topPages: [],
    deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0 },
  })

  const supabase = createClient()

  useEffect(() => {
    fetchStats()

    // Real-time subscription
    const channel = supabase
      .channel('active-sessions-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analytics_active_sessions',
        },
        fetchStats
      )
      .subscribe()

    const interval = setInterval(fetchStats, 15000) // Refresh every 15s

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  async function fetchStats() {
    // Get active sessions (last 5 minutes)
    const { data: sessions } = await supabase
      .from('analytics_active_sessions')
      .select('*')
      .gte('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString())

    if (!sessions) return

    // Calculate stats
    const activeUsers = sessions.length
    const topPages = getTopPages(sessions)
    const deviceBreakdown = getDeviceBreakdown(sessions)

    setStats({ activeUsers, topPages, deviceBreakdown })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm text-gray-600">Active Users</h3>
        <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm text-gray-600">Top Page</h3>
        <p className="text-lg font-semibold truncate">
          {stats.topPages[0]?.page || 'N/A'}
        </p>
        <p className="text-sm text-gray-500">
          {stats.topPages[0]?.count || 0} viewers
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm text-gray-600">Device Breakdown</h3>
        <div className="flex gap-2 mt-2">
          <div className="text-center">
            <p className="text-sm">Mobile</p>
            <p className="font-bold">{stats.deviceBreakdown.mobile}</p>
          </div>
          <div className="text-center">
            <p className="text-sm">Tablet</p>
            <p className="font-bold">{stats.deviceBreakdown.tablet}</p>
          </div>
          <div className="text-center">
            <p className="text-sm">Desktop</p>
            <p className="font-bold">{stats.deviceBreakdown.desktop}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 7. Cleanup: Auto-Expire Stale Sessions

**Supabase Edge Function** (runs every minute):

```sql
-- Create cron job (requires pg_cron extension)
SELECT cron.schedule(
  'cleanup-active-sessions',
  '* * * * *', -- Every minute
  $$SELECT cleanup_stale_active_sessions()$$
);
```

**Or via Next.js API route + external cron** (e.g., Vercel Cron):

```typescript
// app/api/cron/cleanup-sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  // Delete sessions inactive for > 5 minutes
  await supabase
    .from('analytics_active_sessions')
    .delete()
    .lt('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString())

  return NextResponse.json({ success: true })
}
```

---

### 8. Privacy Considerations

**Real-Time Map Privacy**:
- ✅ Admin-only access (RLS policy)
- ✅ City-level location only (no exact address)
- ✅ No personally identifiable information shown
- ✅ Coordinates rounded to ~1km
- ✅ Auto-expire after 5 minutes
- ✅ No session history stored (ephemeral table)

**User Transparency**:
- Privacy policy mentions real-time tracking for admin purposes
- No user-facing implications (data not shared)
- Can opt-out via "Do Not Track"

---

### 9. Performance Optimization

**Reduce Database Load**:
1. Use upsert (not insert) to avoid duplicate sessions
2. Index on `last_activity` for fast cleanup
3. Limit map to show max 1000 active sessions (cluster if more)
4. Cache location data (don't re-lookup IP every heartbeat)

**Reduce Client Load**:
1. Send heartbeat every 30s (not every second)
2. Debounce page changes (don't send if user rapidly switches tabs)
3. Stop heartbeat if tab not visible (Page Visibility API)

```typescript
// Stop heartbeat when tab hidden
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Clear interval when tab hidden
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    } else {
      // Resume heartbeat when tab visible
      sendHeartbeat(pathname)
      intervalRef.current = setInterval(() => sendHeartbeat(pathname), HEARTBEAT_INTERVAL)
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [pathname])
```

---

## Summary: Unique Users + Real-Time Map

### Unique User Tracking
✅ **localStorage persistent ID** for anonymous users
✅ **Merge to authenticated user** on sign-in
✅ **DAU/WAU/MAU queries** included
✅ **New vs returning users** analysis
✅ **Privacy-friendly** (no cookies, no fingerprinting)

### Real-Time Visitor Map
✅ **Live updates** via Supabase Realtime
✅ **Geographic visualization** on Google Maps
✅ **Active user count** (last 5 minutes)
✅ **Device breakdown** (mobile/tablet/desktop)
✅ **Top pages** currently viewed
✅ **Auto-expire** stale sessions
✅ **Privacy-first** (city-level only, admin-only access)

### Cost Impact
- **Storage**: ~1MB for 10k active sessions/day (negligible)
- **Realtime**: Included in Supabase free tier (2M messages/month)
- **Compute**: Minimal (heartbeat is lightweight)

**Total Additional Cost**: **$0/month** (within existing Supabase limits)

---

## Next Steps

1. **Review this document** with team/stakeholders
2. **Decide**: Custom analytics, Plausible, or hybrid?
3. **Prioritize** which metrics to implement first
4. **Schedule** Phase 1 implementation
5. **Create ADR** documenting final analytics decision

---

## References

- [Plausible Analytics](https://plausible.io/) - Privacy-first analytics
- [PostHog](https://posthog.com/) - Open-source product analytics
- [GDPR Compliance Guide](https://gdpr.eu/)
- [Statistical Significance Calculator](https://www.abtestguide.com/abtestsize/)

---

**Document Owner**: Gabriel Serafini
**Last Updated**: 2025-11-10
**Next Review**: After Phase 1 implementation
