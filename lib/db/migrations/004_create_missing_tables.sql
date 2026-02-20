-- Migration: 004_create_missing_tables.sql
-- Creates 7 tables defined in Drizzle schema but missing from production database.
-- Tables: review_helpfulness, verification_events, expansion_priorities,
--         expansion_milestones, county_data, coverage_metrics, research_tasks

-- =============================================================================
-- 1. REVIEW HELPFULNESS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES resource_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_helpfulness_review ON review_helpfulness(review_id);

-- =============================================================================
-- 2. VERIFICATION EVENTS TABLE (for realtime updates)
-- =============================================================================
CREATE TABLE IF NOT EXISTS verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES resource_suggestions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_events_suggestion ON verification_events(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_verification_events_created_at ON verification_events(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_events_type ON verification_events(event_type);

-- =============================================================================
-- 3. EXPANSION PRIORITIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS expansion_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic Info
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  metro_area TEXT,
  region TEXT,

  -- Priority Scoring
  priority_score INTEGER DEFAULT 0,
  priority_tier TEXT DEFAULT 'tier_3',

  -- Ranking Factors
  population INTEGER,
  state_release_volume INTEGER,
  incarceration_rate INTEGER,
  existing_resources_count INTEGER DEFAULT 0,
  geographic_cluster_bonus INTEGER DEFAULT 0,
  data_availability_score INTEGER DEFAULT 0,
  community_partner_count INTEGER DEFAULT 0,

  -- Status & Timeline
  status TEXT NOT NULL DEFAULT 'identified',
  phase TEXT,
  target_launch_date TIMESTAMPTZ,
  actual_launch_date TIMESTAMPTZ,

  -- Research Pipeline Integration
  research_status TEXT DEFAULT 'not_started',
  research_agent_assigned_at TIMESTAMPTZ,
  research_agent_completed_at TIMESTAMPTZ,
  research_notes TEXT,

  -- Resource Goals
  target_resource_count INTEGER DEFAULT 50,
  current_resource_count INTEGER DEFAULT 0,

  -- JSON fields
  priority_categories JSONB DEFAULT '[]',
  data_sources JSONB DEFAULT '[]',

  -- Strategic Notes
  strategic_rationale TEXT,
  blockers TEXT,
  special_considerations TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  launched_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expansion_priorities_status ON expansion_priorities(status);
CREATE INDEX IF NOT EXISTS idx_expansion_priorities_priority_score ON expansion_priorities(priority_score);
CREATE INDEX IF NOT EXISTS idx_expansion_priorities_phase ON expansion_priorities(phase);
CREATE INDEX IF NOT EXISTS idx_expansion_priorities_state ON expansion_priorities(state);

-- =============================================================================
-- 4. EXPANSION MILESTONES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS expansion_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expansion_id UUID NOT NULL REFERENCES expansion_priorities(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  achieved_by UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expansion_milestones_expansion_id ON expansion_milestones(expansion_id);
CREATE INDEX IF NOT EXISTS idx_expansion_milestones_type ON expansion_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_expansion_milestones_date ON expansion_milestones(milestone_date);

-- =============================================================================
-- 5. COUNTY DATA TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS county_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic identifiers
  fips_code TEXT NOT NULL UNIQUE,
  state_fips TEXT NOT NULL,
  county_fips TEXT NOT NULL,
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  county_name TEXT NOT NULL,

  -- Population data
  total_population INTEGER,
  population_year INTEGER,

  -- Reentry population estimates
  estimated_annual_releases INTEGER,
  reentry_data_source TEXT,
  reentry_data_year INTEGER,

  -- Priority classification
  priority_tier INTEGER,
  priority_weight DOUBLE PRECISION,
  priority_reason TEXT,

  -- Geographic data
  geometry JSONB,
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_county_data_fips ON county_data(fips_code);
CREATE INDEX IF NOT EXISTS idx_county_data_state ON county_data(state_code);
CREATE INDEX IF NOT EXISTS idx_county_data_priority ON county_data(priority_tier);

-- =============================================================================
-- 6. COVERAGE METRICS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS coverage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic scope
  geography_type TEXT NOT NULL,
  geography_id TEXT NOT NULL,
  geography_name TEXT NOT NULL,

  -- Composite coverage score (0-100)
  coverage_score DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- Component scores (0-100 each)
  resource_count_score DOUBLE PRECISION DEFAULT 0,
  category_coverage_score DOUBLE PRECISION DEFAULT 0,
  population_coverage_score DOUBLE PRECISION DEFAULT 0,
  verification_score DOUBLE PRECISION DEFAULT 0,

  -- Resource metrics
  total_resources INTEGER DEFAULT 0,
  verified_resources INTEGER DEFAULT 0,
  categories_covered INTEGER DEFAULT 0,
  unique_resources INTEGER DEFAULT 0,

  -- Population coverage
  total_population INTEGER,
  reentry_population INTEGER,

  -- Comparison metrics
  resources_in_211 INTEGER DEFAULT 0,
  comprehensiveness_ratio DOUBLE PRECISION DEFAULT 0,

  -- Quality metrics
  avg_completeness_score DOUBLE PRECISION,
  avg_verification_score DOUBLE PRECISION,
  resources_with_reviews INTEGER DEFAULT 0,
  review_coverage_pct DOUBLE PRECISION DEFAULT 0,

  -- Timestamps
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coverage_metrics_type ON coverage_metrics(geography_type);
CREATE INDEX IF NOT EXISTS idx_coverage_metrics_geography ON coverage_metrics(geography_type, geography_id);
CREATE INDEX IF NOT EXISTS idx_coverage_metrics_score ON coverage_metrics(coverage_score);

-- =============================================================================
-- 7. RESEARCH TASKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task definition
  county TEXT NOT NULL,
  state TEXT NOT NULL,
  category TEXT,
  target_count INTEGER DEFAULT 20,

  -- Status
  status TEXT DEFAULT 'pending',

  -- Assignment
  assigned_to TEXT,
  assigned_at TIMESTAMPTZ,

  -- Progress
  resources_found INTEGER DEFAULT 0,
  resources_published INTEGER DEFAULT 0,

  -- Instructions for agent
  search_instructions TEXT,
  search_queries TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Priority
  priority INTEGER DEFAULT 50
);

CREATE INDEX IF NOT EXISTS idx_research_tasks_status ON research_tasks(status);
CREATE INDEX IF NOT EXISTS idx_research_tasks_assigned ON research_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_research_tasks_county ON research_tasks(county, state);

-- =============================================================================
-- TRIGGERS for updated_at on new tables
-- =============================================================================
DROP TRIGGER IF EXISTS update_expansion_priorities_updated_at ON expansion_priorities;
CREATE TRIGGER update_expansion_priorities_updated_at
  BEFORE UPDATE ON expansion_priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_county_data_updated_at ON county_data;
CREATE TRIGGER update_county_data_updated_at
  BEFORE UPDATE ON county_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_research_tasks_updated_at ON research_tasks;
CREATE TRIGGER update_research_tasks_updated_at
  BEFORE UPDATE ON research_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CLEANUP EXPIRED OTPs FUNCTION (if not exists)
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_otps WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
