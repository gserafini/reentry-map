-- =====================================================
-- ANALYTICS SYSTEM - Complete Database Schema
-- Privacy-first analytics with real-time tracking
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ANALYTICS SESSIONS
-- =====================================================

CREATE TABLE analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,           -- Browser-generated UUID
  user_id UUID REFERENCES users(id),         -- NULL if anonymous
  anonymous_id TEXT,                         -- localStorage persistent ID
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  city TEXT,                                 -- IP geolocation
  state TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON analytics_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_anonymous ON analytics_sessions(anonymous_id, started_at DESC);
CREATE INDEX idx_sessions_time ON analytics_sessions(started_at);
CREATE INDEX idx_sessions_session_id ON analytics_sessions(session_id);

-- =====================================================
-- 2. PAGE VIEWS
-- =====================================================

CREATE TABLE analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  load_time_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_views_path ON analytics_page_views(page_path, timestamp DESC);
CREATE INDEX idx_page_views_session ON analytics_page_views(session_id, timestamp);
CREATE INDEX idx_page_views_time ON analytics_page_views(timestamp DESC);
CREATE INDEX idx_page_views_user ON analytics_page_views(COALESCE(user_id::text, anonymous_id), timestamp DESC);

-- =====================================================
-- 3. SEARCH EVENTS
-- =====================================================

CREATE TABLE analytics_search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  search_query TEXT NOT NULL,                -- Sanitized, PII removed
  filters JSONB,                             -- {category: 'housing', distance: 5}
  results_count INTEGER NOT NULL,
  first_click_position INTEGER,              -- Which result was clicked (1-indexed)
  time_to_first_click_seconds INTEGER,
  refinement_count INTEGER DEFAULT 0,        -- How many times query was changed
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_query ON analytics_search_events(search_query, timestamp DESC);
CREATE INDEX idx_search_no_results ON analytics_search_events(timestamp DESC) WHERE results_count = 0;
CREATE INDEX idx_search_time ON analytics_search_events(timestamp DESC);

-- =====================================================
-- 4. RESOURCE EVENTS
-- =====================================================

CREATE TABLE analytics_resource_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  resource_id UUID NOT NULL REFERENCES resources(id),
  event_type TEXT NOT NULL,                  -- 'view', 'click_call', 'click_directions', 'click_website', 'favorite_add', 'favorite_remove', 'share', 'report'
  time_spent_seconds INTEGER,                -- For 'view' events
  scroll_depth_percent INTEGER,              -- For 'view' events
  source TEXT,                               -- 'search', 'map', 'category', 'favorite', 'direct'
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resource_events_resource ON analytics_resource_events(resource_id, timestamp DESC);
CREATE INDEX idx_resource_events_type ON analytics_resource_events(event_type, timestamp DESC);
CREATE INDEX idx_resource_events_session ON analytics_resource_events(session_id, timestamp);

-- =====================================================
-- 5. MAP EVENTS
-- =====================================================

CREATE TABLE analytics_map_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  event_type TEXT NOT NULL,                  -- 'zoom', 'pan', 'marker_click', 'cluster_expand', 'filter_change', 'view_toggle'
  map_center_lat DECIMAL(9,2),               -- Rounded to ~1km precision for privacy
  map_center_lng DECIMAL(9,2),
  zoom_level INTEGER,
  view_mode TEXT,                            -- 'map', 'list'
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_map_events_type ON analytics_map_events(event_type, timestamp DESC);
CREATE INDEX idx_map_events_location ON analytics_map_events(map_center_lat, map_center_lng);

-- =====================================================
-- 6. FUNNEL EVENTS
-- =====================================================

CREATE TABLE analytics_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_name TEXT NOT NULL,                 -- 'search-to-action', 'signup', 'review-writing'
  step_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_events_session ON analytics_funnel_events(funnel_name, session_id, timestamp);
CREATE INDEX idx_funnel_events_analysis ON analytics_funnel_events(funnel_name, step_number, timestamp DESC);

-- =====================================================
-- 7. FEATURE EVENTS
-- =====================================================

CREATE TABLE analytics_feature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL,                -- 'favorite_toggle', 'filter_category', 'sort_change', 'pwa_install'
  action TEXT NOT NULL,                      -- 'click', 'toggle_on', 'toggle_off', 'submit'
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_events ON analytics_feature_events(feature_name, timestamp DESC);

-- =====================================================
-- 8. PERFORMANCE EVENTS
-- =====================================================

CREATE TABLE analytics_performance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,                  -- 'page_load', 'api_call', 'error'
  page_path TEXT,
  api_endpoint TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  session_id TEXT,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_type ON analytics_performance_events(event_type, timestamp DESC);
CREATE INDEX idx_performance_slow ON analytics_performance_events(duration_ms DESC, timestamp DESC) WHERE duration_ms > 1000;
CREATE INDEX idx_performance_errors ON analytics_performance_events(timestamp DESC) WHERE error_message IS NOT NULL;

-- =====================================================
-- 9. ACTIVE SESSIONS (Real-Time)
-- =====================================================

CREATE TABLE analytics_active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  current_page TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  lat DECIMAL(9,2),                          -- Rounded to ~1km precision
  lng DECIMAL(9,2),
  device_type TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_active_sessions_last_activity ON analytics_active_sessions(last_activity DESC);
CREATE INDEX idx_active_sessions_location ON analytics_active_sessions(lat, lng) WHERE lat IS NOT NULL;

-- =====================================================
-- 10. DAILY METRICS (Aggregated)
-- =====================================================

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

-- Monthly aggregate metrics (lifelong growth tracking)
CREATE TABLE analytics_monthly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_month DATE NOT NULL,                -- First day of month (2025-01-01)
  metric_name TEXT NOT NULL,                 -- 'total_users', 'active_users', 'new_users', etc.
  metric_value NUMERIC NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_month, metric_name)
);

CREATE INDEX idx_monthly_metrics_month ON analytics_monthly_metrics(metric_month DESC);
CREATE INDEX idx_monthly_metrics_name ON analytics_monthly_metrics(metric_name);

-- =====================================================
-- A/B TESTING TABLES
-- =====================================================

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
  experiment_id UUID REFERENCES analytics_experiments(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, session_id)
);

CREATE INDEX idx_assignments ON analytics_experiment_assignments(experiment_id, variant);

CREATE TABLE analytics_experiment_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES analytics_experiments(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES analytics_experiment_assignments(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  converted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversions ON analytics_experiment_conversions(experiment_id, assignment_id);

-- =====================================================
-- ADMIN EVENTS
-- =====================================================

CREATE TABLE analytics_admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_events ON analytics_admin_events(event_type, timestamp DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_resource_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_map_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_feature_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_performance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_experiment_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_admin_events ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can view analytics (all tables get same policy)
CREATE POLICY "Admins can view analytics_sessions"
  ON analytics_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view analytics_page_views"
  ON analytics_page_views FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view analytics_search_events"
  ON analytics_search_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view analytics_resource_events"
  ON analytics_resource_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view analytics_map_events"
  ON analytics_map_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view analytics_funnel_events"
  ON analytics_funnel_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view analytics_feature_events"
  ON analytics_feature_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view analytics_performance_events"
  ON analytics_performance_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view analytics_active_sessions"
  ON analytics_active_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view analytics_daily_metrics"
  ON analytics_daily_metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view experiments"
  ON analytics_experiments FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view experiment_assignments"
  ON analytics_experiment_assignments FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view experiment_conversions"
  ON analytics_experiment_conversions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view admin_events"
  ON analytics_admin_events FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- System can insert analytics (bypass RLS for API routes)
-- These policies allow the anon key to insert events
CREATE POLICY "System can insert sessions"
  ON analytics_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update sessions"
  ON analytics_sessions FOR UPDATE
  USING (true);

CREATE POLICY "System can insert page_views"
  ON analytics_page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert search_events"
  ON analytics_search_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert resource_events"
  ON analytics_resource_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert map_events"
  ON analytics_map_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert funnel_events"
  ON analytics_funnel_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert feature_events"
  ON analytics_feature_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert performance_events"
  ON analytics_performance_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can upsert active_sessions"
  ON analytics_active_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can insert daily_metrics"
  ON analytics_daily_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert experiment_assignments"
  ON analytics_experiment_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert experiment_conversions"
  ON analytics_experiment_conversions FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Update session end time on any event
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

-- Triggers: Auto-update session on events
CREATE TRIGGER update_session_on_page_view
  AFTER INSERT ON analytics_page_views
  FOR EACH ROW
  EXECUTE FUNCTION update_session_ended_at();

CREATE TRIGGER update_session_on_resource_event
  AFTER INSERT ON analytics_resource_events
  FOR EACH ROW
  EXECUTE FUNCTION update_session_ended_at();

CREATE TRIGGER update_session_on_search_event
  AFTER INSERT ON analytics_search_events
  FOR EACH ROW
  EXECUTE FUNCTION update_session_ended_at();

-- Function: Cleanup stale active sessions (>5 minutes old)
CREATE OR REPLACE FUNCTION cleanup_stale_active_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_active_sessions
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function: Merge anonymous user to authenticated user
CREATE OR REPLACE FUNCTION merge_anonymous_user(
  p_anonymous_id TEXT,
  p_authenticated_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Update sessions
  UPDATE analytics_sessions
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;

  -- Update page views
  UPDATE analytics_page_views
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;

  -- Update search events
  UPDATE analytics_search_events
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;

  -- Update resource events
  UPDATE analytics_resource_events
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;

  -- Update map events
  UPDATE analytics_map_events
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;

  -- Update funnel events
  UPDATE analytics_funnel_events
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;

  -- Update feature events
  UPDATE analytics_feature_events
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;

  -- Update performance events
  UPDATE analytics_performance_events
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;

  -- Update active sessions
  UPDATE analytics_active_sessions
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;

  -- Update experiment assignments
  UPDATE analytics_experiment_assignments
  SET user_id = p_authenticated_user_id
  WHERE anonymous_id = p_anonymous_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate daily metrics (run via cron)
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

-- Function: Cleanup old analytics (180-day retention for event-level detail)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  -- Event-level data: 180 days (allows seasonal analysis)
  DELETE FROM analytics_page_views WHERE timestamp < NOW() - INTERVAL '180 days';
  DELETE FROM analytics_search_events WHERE timestamp < NOW() - INTERVAL '180 days';
  DELETE FROM analytics_resource_events WHERE timestamp < NOW() - INTERVAL '180 days';
  DELETE FROM analytics_map_events WHERE timestamp < NOW() - INTERVAL '180 days';
  DELETE FROM analytics_funnel_events WHERE timestamp < NOW() - INTERVAL '180 days';
  DELETE FROM analytics_feature_events WHERE timestamp < NOW() - INTERVAL '180 days';
  DELETE FROM analytics_performance_events WHERE timestamp < NOW() - INTERVAL '180 days';
  DELETE FROM analytics_sessions WHERE started_at < NOW() - INTERVAL '180 days';

  -- Daily metrics: Keep forever for lifelong growth tracking (minimal storage cost)
  -- Monthly aggregates: Keep forever for long-term trend analysis
  -- Only clean up if storage becomes an issue (not expected for years)
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MATERIALIZED VIEWS (for fast queries)
-- =====================================================

-- Top resources last 7 days
CREATE MATERIALIZED VIEW analytics_top_resources_7d AS
SELECT
  r.id,
  r.name,
  r.primary_category,
  COUNT(DISTINCT e.session_id) as unique_views,
  AVG(e.time_spent_seconds) FILTER (WHERE e.event_type = 'view') as avg_time_spent,
  SUM(CASE WHEN e.event_type = 'click_call' THEN 1 ELSE 0 END) as calls,
  SUM(CASE WHEN e.event_type = 'click_directions' THEN 1 ELSE 0 END) as directions,
  SUM(CASE WHEN e.event_type = 'favorite_add' THEN 1 ELSE 0 END) as favorites
FROM analytics_resource_events e
JOIN resources r ON r.id = e.resource_id
WHERE e.timestamp > NOW() - INTERVAL '7 days'
GROUP BY r.id, r.name, r.primary_category
ORDER BY unique_views DESC;

CREATE UNIQUE INDEX idx_top_resources_7d ON analytics_top_resources_7d(id);

-- Search gaps last 7 days
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
GROUP BY search_query
ORDER BY search_count DESC;

CREATE UNIQUE INDEX idx_search_gaps_7d ON analytics_search_gaps_7d(search_query);

-- =====================================================
-- DEPLOYMENT TRACKING
-- =====================================================

-- Deployment tracking for change attribution
CREATE TABLE analytics_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  git_commit_hash TEXT,                      -- Short hash: '3a4f5c2'
  git_branch TEXT,                           -- 'main', 'feat/new-search'
  git_commit_message TEXT,                   -- Full commit message
  version_tag TEXT,                          -- 'v1.2.3' (if tagged release)
  deployed_by TEXT,                          -- 'github-actions' or email
  vercel_deployment_id TEXT,                 -- Vercel deployment URL
  description TEXT,                          -- Human-readable description
  deployment_type TEXT DEFAULT 'production', -- 'production', 'staging', 'preview'
  is_rollback BOOLEAN DEFAULT false,
  rolled_back_at TIMESTAMPTZ,
  metadata JSONB,                            -- CI/CD info, PR number, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deployments_time ON analytics_deployments(deployed_at DESC);
CREATE INDEX idx_deployments_branch ON analytics_deployments(git_branch);
CREATE INDEX idx_deployments_type ON analytics_deployments(deployment_type);

-- =====================================================
-- AGGREGATE FUNCTIONS
-- =====================================================

-- Function: Rollup monthly metrics from daily metrics
CREATE OR REPLACE FUNCTION rollup_monthly_metrics()
RETURNS void AS $$
DECLARE
  last_month DATE := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
BEGIN
  -- Roll up summed metrics from daily metrics
  INSERT INTO analytics_monthly_metrics (metric_month, metric_name, metric_value)
  SELECT
    last_month,
    metric_name,
    SUM(metric_value) as total
  FROM analytics_daily_metrics
  WHERE metric_date >= last_month
    AND metric_date < DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY metric_name
  ON CONFLICT (metric_month, metric_name) DO UPDATE
    SET metric_value = EXCLUDED.metric_value;

  -- Cumulative metrics (not summed, but latest snapshot)
  INSERT INTO analytics_monthly_metrics (metric_month, metric_name, metric_value)
  VALUES
    (last_month, 'total_users', (SELECT COUNT(*) FROM users WHERE created_at < DATE_TRUNC('month', CURRENT_DATE))),
    (last_month, 'total_resources', (SELECT COUNT(*) FROM resources WHERE created_at < DATE_TRUNC('month', CURRENT_DATE))),
    (last_month, 'total_reviews', (SELECT COUNT(*) FROM resource_reviews WHERE created_at < DATE_TRUNC('month', CURRENT_DATE)))
  ON CONFLICT (metric_month, metric_name) DO UPDATE
    SET metric_value = EXCLUDED.metric_value;
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule this function to run on the 1st of each month
-- Example with pg_cron extension:
-- SELECT cron.schedule('rollup-monthly-metrics', '0 2 1 * *', 'SELECT rollup_monthly_metrics()');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE analytics_sessions IS 'User session tracking (anonymous + authenticated)';
COMMENT ON TABLE analytics_page_views IS 'Page view events';
COMMENT ON TABLE analytics_search_events IS 'Search behavior tracking';
COMMENT ON TABLE analytics_resource_events IS 'Resource interaction tracking';
COMMENT ON TABLE analytics_map_events IS 'Map interaction tracking';
COMMENT ON TABLE analytics_funnel_events IS 'Conversion funnel tracking';
COMMENT ON TABLE analytics_feature_events IS 'Feature usage tracking';
COMMENT ON TABLE analytics_performance_events IS 'Performance and error monitoring';
COMMENT ON TABLE analytics_active_sessions IS 'Real-time active sessions (ephemeral, 5min TTL)';
COMMENT ON TABLE analytics_daily_metrics IS 'Pre-aggregated daily metrics for fast queries';
COMMENT ON TABLE analytics_monthly_metrics IS 'Monthly aggregate metrics for lifelong growth tracking';
COMMENT ON TABLE analytics_experiments IS 'A/B test experiments';
COMMENT ON TABLE analytics_experiment_assignments IS 'A/B test variant assignments';
COMMENT ON TABLE analytics_experiment_conversions IS 'A/B test conversion tracking';
COMMENT ON TABLE analytics_admin_events IS 'Admin action tracking';
COMMENT ON TABLE analytics_deployments IS 'Deployment tracking for change attribution and regression detection';
