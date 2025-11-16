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
-- ANALYTICS TIMELINE ANNOTATIONS
-- =====================================================

-- Flexible annotation system for tracking events that affect metrics
-- Supports deployments, press mentions, partnerships, incidents, holidays, etc.
CREATE TABLE analytics_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,                  -- 'deployment', 'press', 'partnership', 'incident', 'holiday', 'marketing', 'policy_change', 'milestone'
  title TEXT NOT NULL,                       -- Short description: "Deploy v1.2.3" or "TechCrunch article"
  description TEXT,                          -- Longer context

  -- Clickable links for easy investigation
  url TEXT,                                  -- Primary URL (GitHub commit, article, Vercel deployment, etc.)
  secondary_urls JSONB,                      -- Array of related URLs: ["https://...", "https://..."]

  -- Searchable metadata
  tags TEXT[],                               -- ['bug', 'critical'] or ['marketing', 'email-campaign']
  severity TEXT DEFAULT 'info',              -- 'info', 'warning', 'critical' (for incidents)
  impact_assessment TEXT DEFAULT 'unknown',  -- 'positive', 'negative', 'neutral', 'unknown'

  -- Attribution
  created_by UUID REFERENCES users(id),      -- Who logged it (NULL if automated)
  source TEXT NOT NULL,                      -- 'manual', 'github-actions', 'ai-agent', 'monitoring-alert'

  -- Flexible metadata for any event type
  metadata JSONB,                            -- Type-specific data

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_annotations_time ON analytics_annotations(timestamp DESC);
CREATE INDEX idx_annotations_type ON analytics_annotations(event_type);
CREATE INDEX idx_annotations_tags ON analytics_annotations USING GIN(tags);
CREATE INDEX idx_annotations_severity ON analytics_annotations(severity) WHERE severity IN ('warning', 'critical');

-- =====================================================
-- GOOGLE SEARCH CONSOLE INTEGRATION
-- =====================================================

-- GSC keyword performance (synced daily)
CREATE TABLE analytics_gsc_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  query TEXT NOT NULL,                       -- "housing assistance oakland"
  page_url TEXT NOT NULL,                    -- Landing page
  impressions INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  ctr NUMERIC,                               -- Click-through rate
  position NUMERIC,                          -- Average ranking position
  country TEXT DEFAULT 'USA',
  device TEXT,                               -- 'mobile', 'desktop', 'tablet'
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, query, page_url, country, device)
);

CREATE INDEX idx_gsc_keywords_query ON analytics_gsc_keywords(query, date DESC);
CREATE INDEX idx_gsc_keywords_date ON analytics_gsc_keywords(date DESC);
CREATE INDEX idx_gsc_keywords_page ON analytics_gsc_keywords(page_url, date DESC);
CREATE INDEX idx_gsc_keywords_clicks ON analytics_gsc_keywords(clicks DESC);

-- Aggregated GSC performance (updated daily)
CREATE TABLE analytics_gsc_performance (
  query TEXT PRIMARY KEY,
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  avg_ctr NUMERIC,
  avg_position NUMERIC,
  trend_7d NUMERIC,                          -- % change vs previous 7 days
  trend_30d NUMERIC,
  best_performing_page TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gsc_perf_clicks ON analytics_gsc_performance(total_clicks DESC);
CREATE INDEX idx_gsc_perf_trend ON analytics_gsc_performance(trend_7d DESC);

-- Correlation: GSC keyword → Internal search behavior
CREATE TABLE analytics_gsc_internal_correlation (
  gsc_query TEXT NOT NULL,
  internal_search_query TEXT NOT NULL,
  correlation_count INTEGER DEFAULT 1,
  avg_time_to_internal_search INTERVAL,
  conversion_rate NUMERIC,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (gsc_query, internal_search_query)
);

CREATE INDEX idx_gsc_correlation_query ON analytics_gsc_internal_correlation(gsc_query);

-- =====================================================
-- ALERTS & NOTIFICATIONS
-- =====================================================

-- Alert definitions
CREATE TABLE analytics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_name TEXT NOT NULL,                 -- 'dau', 'conversion_rate', 'error_rate', etc.
  threshold_type TEXT NOT NULL,              -- 'absolute', 'percentage_change', 'std_deviation'
  threshold_value NUMERIC NOT NULL,
  comparison_period INTERVAL,                -- Compare to '7 days' ago, '1 day' ago
  check_frequency INTERVAL NOT NULL,         -- How often to check (5min, 1hour, 1day)
  notification_channels JSONB,               -- ['email', 'slack', 'webhook']
  notification_config JSONB,                 -- Email addresses, Slack webhook URLs, etc.
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_active ON analytics_alerts(is_active, check_frequency);
CREATE INDEX idx_alerts_metric ON analytics_alerts(metric_name);

-- Alert trigger history
CREATE TABLE analytics_alert_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES analytics_alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  comparison_value NUMERIC,                  -- Value from comparison period
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',           -- 'info', 'warning', 'critical'
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  acknowledgment_note TEXT,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_alert_triggers_alert ON analytics_alert_triggers(alert_id, triggered_at DESC);
CREATE INDEX idx_alert_triggers_unack ON analytics_alert_triggers(triggered_at DESC) WHERE acknowledged_at IS NULL;

-- =====================================================
-- UTM ATTRIBUTION & CAMPAIGN TRACKING
-- =====================================================

-- User attribution (first touch & last touch)
CREATE TABLE analytics_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,

  -- First touch (how they discovered us)
  first_touch_timestamp TIMESTAMPTZ,
  first_touch_source TEXT,                   -- 'google', 'facebook', 'direct', '211'
  first_touch_medium TEXT,                   -- 'organic', 'cpc', 'email', 'referral'
  first_touch_campaign TEXT,
  first_touch_content TEXT,
  first_touch_term TEXT,
  first_touch_referrer TEXT,
  first_touch_landing_page TEXT,

  -- Last touch (what converted them)
  last_touch_timestamp TIMESTAMPTZ,
  last_touch_source TEXT,
  last_touch_medium TEXT,
  last_touch_campaign TEXT,
  last_touch_content TEXT,
  last_touch_term TEXT,
  last_touch_referrer TEXT,
  last_touch_landing_page TEXT,

  -- Conversion
  converted_at TIMESTAMPTZ,
  conversion_type TEXT,                      -- 'sign_up', 'first_action', 'first_review'

  -- Full journey (for multi-touch attribution)
  touchpoints JSONB,                         -- Array of all touchpoints with timestamps

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id),
  UNIQUE(anonymous_id)
);

CREATE INDEX idx_attribution_user ON analytics_attribution(user_id);
CREATE INDEX idx_attribution_anon ON analytics_attribution(anonymous_id);
CREATE INDEX idx_attribution_first_source ON analytics_attribution(first_touch_source, first_touch_medium);
CREATE INDEX idx_attribution_converted ON analytics_attribution(converted_at) WHERE converted_at IS NOT NULL;

-- Campaign performance rollup
CREATE TABLE analytics_campaign_performance (
  campaign_key TEXT PRIMARY KEY,             -- 'source|medium|campaign' e.g., 'facebook|cpc|jan-housing'
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT,
  sessions INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC,
  bounce_rate NUMERIC,
  avg_session_duration INTERVAL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_perf_source ON analytics_campaign_performance(source, medium);
CREATE INDEX idx_campaign_perf_conversions ON analytics_campaign_performance(conversions DESC);

-- =====================================================
-- RETENTION & COHORT ANALYSIS
-- =====================================================

-- User cohorts (grouped by signup week/month)
CREATE TABLE analytics_user_cohorts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cohort_week DATE NOT NULL,                 -- Week they signed up (Monday)
  cohort_month DATE NOT NULL,                -- Month they signed up (1st)
  first_session_at TIMESTAMPTZ NOT NULL,
  first_action_type TEXT,                    -- What was their first meaningful action?
  first_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_cohorts_week ON analytics_user_cohorts(cohort_week);
CREATE INDEX idx_user_cohorts_month ON analytics_user_cohorts(cohort_month);

-- Pre-calculated retention rates by cohort
CREATE TABLE analytics_retention_metrics (
  cohort_date DATE NOT NULL,
  cohort_type TEXT NOT NULL,                 -- 'weekly', 'monthly'
  cohort_size INTEGER NOT NULL,
  day_1_retained INTEGER DEFAULT 0,
  day_7_retained INTEGER DEFAULT 0,
  day_30_retained INTEGER DEFAULT 0,
  day_90_retained INTEGER DEFAULT 0,
  day_1_rate NUMERIC,
  day_7_rate NUMERIC,
  day_30_rate NUMERIC,
  day_90_rate NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cohort_date, cohort_type)
);

CREATE INDEX idx_retention_date ON analytics_retention_metrics(cohort_date DESC);

-- =====================================================
-- FEATURE ADOPTION TRACKING
-- =====================================================

-- Feature definitions (for tracking)
CREATE TABLE analytics_feature_definitions (
  feature_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  launch_date DATE NOT NULL,
  category TEXT,                             -- 'search', 'map', 'social', 'discovery'
  is_core_feature BOOLEAN DEFAULT false,
  target_adoption_rate NUMERIC,              -- e.g., 0.80 for 80% adoption
  target_weeks INTEGER,                      -- Weeks to reach target
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track when users first use each feature
CREATE TABLE analytics_feature_adoption (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_name TEXT REFERENCES analytics_feature_definitions(feature_name),
  first_used_at TIMESTAMPTZ NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, feature_name)
);

CREATE INDEX idx_feature_adoption_feature ON analytics_feature_adoption(feature_name, first_used_at);
CREATE INDEX idx_feature_adoption_user ON analytics_feature_adoption(user_id);

-- Feature adoption metrics (updated daily)
CREATE TABLE analytics_feature_adoption_metrics (
  feature_name TEXT REFERENCES analytics_feature_definitions(feature_name),
  date DATE NOT NULL,
  weeks_since_launch INTEGER NOT NULL,
  total_users INTEGER NOT NULL,              -- Total active users
  adopted_users INTEGER NOT NULL,            -- Users who used feature
  adoption_rate NUMERIC NOT NULL,
  new_adopters INTEGER DEFAULT 0,            -- New users who adopted today
  PRIMARY KEY (feature_name, date)
);

CREATE INDEX idx_feature_metrics_feature ON analytics_feature_adoption_metrics(feature_name, date DESC);

-- =====================================================
-- USER SEGMENTATION
-- =====================================================

-- Pre-calculated user segments (updated daily)
CREATE TABLE analytics_user_segments (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Engagement segments
  engagement_level TEXT,                     -- 'power', 'regular', 'casual', 'dormant'
  sessions_last_7d INTEGER DEFAULT 0,
  sessions_last_30d INTEGER DEFAULT 0,
  actions_last_7d INTEGER DEFAULT 0,
  actions_last_30d INTEGER DEFAULT 0,

  -- Behavioral segments
  primary_category TEXT,                     -- Most-searched category
  preferred_device TEXT,                     -- 'mobile', 'desktop', 'tablet'
  preferred_time_of_day TEXT,                -- 'morning', 'afternoon', 'evening', 'night'

  -- Value segments
  has_reviewed BOOLEAN DEFAULT false,
  has_favorited BOOLEAN DEFAULT false,
  review_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,

  -- Recency
  last_session_at TIMESTAMPTZ,
  days_since_last_session INTEGER,

  -- Lifetime value indicators
  lifetime_sessions INTEGER DEFAULT 0,
  lifetime_actions INTEGER DEFAULT 0,
  days_since_signup INTEGER,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_segments_engagement ON analytics_user_segments(engagement_level);
CREATE INDEX idx_user_segments_category ON analytics_user_segments(primary_category);
CREATE INDEX idx_user_segments_device ON analytics_user_segments(preferred_device);
CREATE INDEX idx_user_segments_recency ON analytics_user_segments(days_since_last_session);

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
COMMENT ON TABLE analytics_annotations IS 'Timeline annotations for all events affecting metrics (deployments, press, partnerships, incidents, holidays, etc.)';
COMMENT ON TABLE analytics_gsc_keywords IS 'Google Search Console keyword performance data (synced daily)';
COMMENT ON TABLE analytics_gsc_performance IS 'Aggregated GSC performance metrics per query';
COMMENT ON TABLE analytics_gsc_internal_correlation IS 'Correlation between GSC keywords and internal search behavior';
COMMENT ON TABLE analytics_alerts IS 'Alert definitions for proactive monitoring';
COMMENT ON TABLE analytics_alert_triggers IS 'Alert trigger history and acknowledgments';
COMMENT ON TABLE analytics_attribution IS 'User attribution tracking (first touch, last touch, full journey)';
COMMENT ON TABLE analytics_campaign_performance IS 'Campaign performance rollup for marketing ROI';
COMMENT ON TABLE analytics_user_cohorts IS 'User cohorts grouped by signup date';
COMMENT ON TABLE analytics_retention_metrics IS 'Pre-calculated retention rates by cohort';
COMMENT ON TABLE analytics_feature_definitions IS 'Feature definitions for adoption tracking';
COMMENT ON TABLE analytics_feature_adoption IS 'User-level feature adoption tracking';
COMMENT ON TABLE analytics_feature_adoption_metrics IS 'Daily feature adoption metrics';
COMMENT ON TABLE analytics_user_segments IS 'Pre-calculated user segmentation (engagement, behavior, value)';
