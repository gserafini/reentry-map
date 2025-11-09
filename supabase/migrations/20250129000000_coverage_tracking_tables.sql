-- Coverage Tracking System Database Schema
-- Creates tables for tracking resource coverage metrics across geographic regions

-- ============================================================================
-- Table: county_data
-- Stores US county reference data with geographic boundaries and reentry stats
-- ============================================================================

CREATE TABLE IF NOT EXISTS county_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic identifiers
  fips_code TEXT NOT NULL UNIQUE, -- 5-digit FIPS code (state + county)
  state_fips TEXT NOT NULL,       -- 2-digit state FIPS
  county_fips TEXT NOT NULL,      -- 3-digit county FIPS
  state_code TEXT NOT NULL,       -- 2-letter state code (e.g., 'CA')
  state_name TEXT NOT NULL,       -- Full state name
  county_name TEXT NOT NULL,      -- County name

  -- Population data
  total_population INTEGER,
  population_year INTEGER,

  -- Reentry population estimates
  estimated_annual_releases INTEGER,
  reentry_data_source TEXT,
  reentry_data_year INTEGER,

  -- Priority classification
  priority_tier INTEGER CHECK (priority_tier BETWEEN 1 AND 5),
  priority_weight DECIMAL(3,1), -- Multiplier for coverage calculations
  priority_reason TEXT,          -- Why this county is prioritized

  -- Geographic data
  geometry JSONB,                -- GeoJSON boundary for mapping
  center_lat DECIMAL(10,7),      -- County center latitude
  center_lng DECIMAL(10,7),      -- County center longitude

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for county_data
CREATE INDEX idx_county_data_fips ON county_data(fips_code);
CREATE INDEX idx_county_data_state ON county_data(state_code);
CREATE INDEX idx_county_data_priority ON county_data(priority_tier) WHERE priority_tier IS NOT NULL;
CREATE INDEX idx_county_data_location ON county_data(center_lat, center_lng);

-- ============================================================================
-- Table: coverage_metrics
-- Stores calculated coverage scores for different geographic levels
-- ============================================================================

CREATE TABLE IF NOT EXISTS coverage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic scope
  geography_type TEXT NOT NULL CHECK (geography_type IN ('national', 'state', 'county', 'city')),
  geography_id TEXT NOT NULL,    -- FIPS code, state code, or 'US' for national
  geography_name TEXT NOT NULL,  -- Display name

  -- Composite coverage score (0-100)
  coverage_score DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Component scores (0-100 each)
  resource_count_score DECIMAL(5,2) DEFAULT 0,
  category_coverage_score DECIMAL(5,2) DEFAULT 0,
  population_coverage_score DECIMAL(5,2) DEFAULT 0,
  verification_score DECIMAL(5,2) DEFAULT 0,

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
  comprehensiveness_ratio DECIMAL(5,3) DEFAULT 0, -- our resources / 211 resources

  -- Quality metrics
  avg_completeness_score DECIMAL(5,2),
  avg_verification_score DECIMAL(5,2),
  resources_with_reviews INTEGER DEFAULT 0,
  review_coverage_pct DECIMAL(5,2) DEFAULT 0,

  -- Timestamp
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one record per geography
  UNIQUE(geography_type, geography_id)
);

-- Indexes for coverage_metrics
CREATE INDEX idx_coverage_metrics_type ON coverage_metrics(geography_type);
CREATE INDEX idx_coverage_metrics_geography ON coverage_metrics(geography_type, geography_id);
CREATE INDEX idx_coverage_metrics_score ON coverage_metrics(coverage_score DESC);
CREATE INDEX idx_coverage_metrics_updated ON coverage_metrics(last_updated DESC);

-- ============================================================================
-- Add comparison tracking fields to resources table
-- ============================================================================

-- Track whether this resource is unique to our platform
ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_unique BOOLEAN DEFAULT false;

-- Track which external sources also list this resource
ALTER TABLE resources ADD COLUMN IF NOT EXISTS also_in_211 BOOLEAN DEFAULT false;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS also_in_govt_db BOOLEAN DEFAULT false;

-- External IDs for deduplication
ALTER TABLE resources ADD COLUMN IF NOT EXISTS external_211_id TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS external_govt_id TEXT;

-- Index for uniqueness queries
CREATE INDEX IF NOT EXISTS idx_resources_unique ON resources(is_unique) WHERE is_unique = true;

-- ============================================================================
-- Add county FIPS code to resources for coverage calculations
-- ============================================================================

ALTER TABLE resources ADD COLUMN IF NOT EXISTS county_fips TEXT;

-- Index for county-based queries
CREATE INDEX IF NOT EXISTS idx_resources_county_fips ON resources(county_fips) WHERE county_fips IS NOT NULL;

-- ============================================================================
-- Update timestamp trigger for county_data
-- ============================================================================

CREATE OR REPLACE FUNCTION update_county_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER county_data_updated
  BEFORE UPDATE ON county_data
  FOR EACH ROW
  EXECUTE FUNCTION update_county_data_timestamp();

-- ============================================================================
-- Update timestamp trigger for coverage_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION update_coverage_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coverage_metrics_updated
  BEFORE UPDATE ON coverage_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_coverage_metrics_timestamp();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE county_data IS 'Reference data for all US counties with reentry population estimates and priority classification';
COMMENT ON TABLE coverage_metrics IS 'Calculated coverage scores for different geographic regions (national, state, county, city)';
COMMENT ON COLUMN coverage_metrics.coverage_score IS 'Weighted composite score: 30% resource count + 30% category coverage + 20% population + 20% verification';
COMMENT ON COLUMN county_data.priority_tier IS 'Priority tier (1=highest, 5=lowest) based on estimated reentry population';
COMMENT ON COLUMN county_data.priority_weight IS 'Multiplier for coverage calculations (Tier 1: 5.0, Tier 2: 3.0, Tier 3: 2.0, Tier 4: 1.5, Tier 5: 1.0)';
