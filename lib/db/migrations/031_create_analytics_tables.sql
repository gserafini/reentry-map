-- =====================================================
-- Analytics tables for privacy-first user tracking
-- Creates all tables referenced by app/api/analytics/
-- =====================================================

-- 1. Sessions (upserted on each batch)
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  page_views INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON analytics_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_anonymous ON analytics_sessions(anonymous_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_time ON analytics_sessions(started_at);

-- 2. Page Views
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  load_time_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_path ON analytics_page_views(page_path, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON analytics_page_views(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_page_views_time ON analytics_page_views(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_non_admin ON analytics_page_views(timestamp DESC) WHERE is_admin = false;

-- 3. Search Events
CREATE TABLE IF NOT EXISTS analytics_search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  search_query TEXT NOT NULL,
  filters JSONB,
  results_count INTEGER NOT NULL DEFAULT 0,
  first_click_position INTEGER,
  time_to_first_click_seconds INTEGER,
  refinement_count INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_query ON analytics_search_events(search_query, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_no_results ON analytics_search_events(timestamp DESC) WHERE results_count = 0;
CREATE INDEX IF NOT EXISTS idx_search_time ON analytics_search_events(timestamp DESC);

-- 4. Resource Events
CREATE TABLE IF NOT EXISTS analytics_resource_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  resource_id UUID NOT NULL REFERENCES resources(id),
  event_type TEXT NOT NULL,
  time_spent_seconds INTEGER,
  scroll_depth_percent INTEGER,
  source TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_events_resource ON analytics_resource_events(resource_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_resource_events_type ON analytics_resource_events(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_resource_events_session ON analytics_resource_events(session_id, timestamp);

-- 5. Map Events
CREATE TABLE IF NOT EXISTS analytics_map_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  event_type TEXT NOT NULL,
  center_lat DECIMAL(9,6),
  center_lng DECIMAL(9,6),
  zoom_level INTEGER,
  visible_markers INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_events_type ON analytics_map_events(event_type, timestamp DESC);

-- 6. Feature Events
CREATE TABLE IF NOT EXISTS analytics_feature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  feature_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'use',
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_events ON analytics_feature_events(feature_name, timestamp DESC);

-- 7. Performance Events
CREATE TABLE IF NOT EXISTS analytics_performance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  user_id UUID REFERENCES users(id),
  anonymous_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  event_type TEXT NOT NULL,
  page_path TEXT,
  metric_name TEXT,
  metric_value DECIMAL(12,2),
  error_message TEXT,
  error_stack TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_type ON analytics_performance_events(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_errors ON analytics_performance_events(timestamp DESC) WHERE error_message IS NOT NULL;
