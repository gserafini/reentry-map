-- =====================================================
-- FIX ANALYTICS SCHEMA - Add Missing Columns
-- Fixes schema mismatches between migration and API code
-- =====================================================

-- =====================================================
-- 1. ADD is_admin COLUMN TO ALL ANALYTICS TABLES
-- =====================================================

-- Core event tables
ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE analytics_search_events ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE analytics_resource_events ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE analytics_map_events ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE analytics_funnel_events ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE analytics_feature_events ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE analytics_performance_events ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE analytics_active_sessions ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- =====================================================
-- 2. FIX COLUMN NAME MISMATCHES
-- =====================================================

-- Fix analytics_map_events column names
-- API expects: center_lat, center_lng, visible_markers
-- Schema has: map_center_lat, map_center_lng, (missing visible_markers)
ALTER TABLE analytics_map_events RENAME COLUMN map_center_lat TO center_lat;
ALTER TABLE analytics_map_events RENAME COLUMN map_center_lng TO center_lng;
ALTER TABLE analytics_map_events ADD COLUMN IF NOT EXISTS visible_markers INTEGER;

-- Fix analytics_feature_events column name
-- API expects: event_type
-- Schema has: action
ALTER TABLE analytics_feature_events RENAME COLUMN action TO event_type;

-- Fix analytics_performance_events missing columns
-- API expects: metric_name, metric_value as top-level columns
ALTER TABLE analytics_performance_events ADD COLUMN IF NOT EXISTS metric_name TEXT;
ALTER TABLE analytics_performance_events ADD COLUMN IF NOT EXISTS metric_value NUMERIC;

-- =====================================================
-- 3. ADD INDEXES FOR is_admin FILTERING
-- =====================================================

-- Partial indexes for fast non-admin queries
CREATE INDEX IF NOT EXISTS idx_sessions_non_admin ON analytics_sessions(started_at DESC) WHERE is_admin = false;
CREATE INDEX IF NOT EXISTS idx_page_views_non_admin ON analytics_page_views(timestamp DESC) WHERE is_admin = false;
CREATE INDEX IF NOT EXISTS idx_search_events_non_admin ON analytics_search_events(timestamp DESC) WHERE is_admin = false;
CREATE INDEX IF NOT EXISTS idx_resource_events_non_admin ON analytics_resource_events(timestamp DESC) WHERE is_admin = false;
CREATE INDEX IF NOT EXISTS idx_map_events_non_admin ON analytics_map_events(timestamp DESC) WHERE is_admin = false;
CREATE INDEX IF NOT EXISTS idx_feature_events_non_admin ON analytics_feature_events(timestamp DESC) WHERE is_admin = false;
CREATE INDEX IF NOT EXISTS idx_performance_events_non_admin ON analytics_performance_events(timestamp DESC) WHERE is_admin = false;

-- Update existing index after column rename
DROP INDEX IF EXISTS idx_map_events_location;
CREATE INDEX idx_map_events_location ON analytics_map_events(center_lat, center_lng);

-- =====================================================
-- 4. UPDATE RLS POLICIES (if needed)
-- =====================================================

-- Note: RLS policies for analytics tables should already be set to admin-only
-- This is just documentation of expected behavior:
-- - All analytics_* tables should have RLS enabled
-- - Only admins (users with is_admin = true) can SELECT
-- - System can INSERT without restriction (for tracking)
-- - No UPDATE or DELETE allowed (append-only logs)

-- =====================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN analytics_sessions.is_admin IS 'Filter to exclude admin activity from public analytics';
COMMENT ON COLUMN analytics_page_views.is_admin IS 'Filter to exclude admin activity from public analytics';
COMMENT ON COLUMN analytics_search_events.is_admin IS 'Filter to exclude admin activity from public analytics';
COMMENT ON COLUMN analytics_resource_events.is_admin IS 'Filter to exclude admin activity from public analytics';
COMMENT ON COLUMN analytics_map_events.is_admin IS 'Filter to exclude admin activity from public analytics';
COMMENT ON COLUMN analytics_map_events.visible_markers IS 'Number of markers visible in current viewport';
COMMENT ON COLUMN analytics_feature_events.is_admin IS 'Filter to exclude admin activity from public analytics';
COMMENT ON COLUMN analytics_performance_events.is_admin IS 'Filter to exclude admin activity from public analytics';
COMMENT ON COLUMN analytics_performance_events.metric_name IS 'Performance metric name (e.g., FCP, LCP, TTI)';
COMMENT ON COLUMN analytics_performance_events.metric_value IS 'Performance metric value in milliseconds';
