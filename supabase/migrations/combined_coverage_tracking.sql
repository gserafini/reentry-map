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
-- Coverage Metrics Calculation Function
-- Calculates comprehensive coverage scores for a given geographic region

-- ============================================================================
-- Helper function: Calculate resource count score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_resource_count_score(
  p_resource_count INTEGER,
  p_target_count INTEGER DEFAULT 50
) RETURNS DECIMAL(5,2) AS $$
BEGIN
  -- Score based on resources vs. target (max 100)
  -- Target: 50 resources = 100 points
  RETURN LEAST(100, (p_resource_count::DECIMAL / p_target_count) * 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Helper function: Calculate category coverage score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_category_coverage_score(
  p_categories_covered INTEGER,
  p_total_categories INTEGER DEFAULT 13
) RETURNS DECIMAL(5,2) AS $$
BEGIN
  -- Score based on category breadth
  -- All 13 categories = 100 points
  RETURN (p_categories_covered::DECIMAL / p_total_categories) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Helper function: Calculate population coverage score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_population_coverage_score(
  p_resource_count INTEGER,
  p_reentry_population INTEGER
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_resources_per_1000 DECIMAL(10,2);
BEGIN
  IF p_reentry_population IS NULL OR p_reentry_population = 0 THEN
    -- If no population data, base on resource count alone
    RETURN calculate_resource_count_score(p_resource_count);
  END IF;

  -- Calculate resources per 1,000 returning citizens
  v_resources_per_1000 := (p_resource_count::DECIMAL / p_reentry_population) * 1000;

  -- Target: 5 resources per 1,000 = 100 points
  -- Scale: 0-10 resources per 1,000 = 0-100 points
  RETURN LEAST(100, v_resources_per_1000 * 20);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Helper function: Calculate verification score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_verification_score(
  p_verified_count INTEGER,
  p_total_count INTEGER,
  p_avg_verification DECIMAL DEFAULT 0.5
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_verification_rate DECIMAL(5,2);
BEGIN
  IF p_total_count = 0 THEN
    RETURN 0;
  END IF;

  -- Verification rate (0-1)
  v_verification_rate := p_verified_count::DECIMAL / p_total_count;

  -- Combine with average verification score
  -- 50% weight on binary verification, 50% on score
  RETURN ((v_verification_rate * 50) + (p_avg_verification * 50));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Main function: Calculate coverage metrics for a geography
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_coverage_metrics(
  p_geography_type TEXT,
  p_geography_id TEXT
) RETURNS VOID AS $$
DECLARE
  v_geography_name TEXT;
  v_resource_count INTEGER;
  v_verified_count INTEGER;
  v_categories_covered INTEGER;
  v_unique_count INTEGER;
  v_avg_completeness DECIMAL(5,2);
  v_avg_verification DECIMAL(5,2);
  v_review_count INTEGER;
  v_total_population INTEGER;
  v_reentry_population INTEGER;
  v_resources_in_211 INTEGER;

  v_resource_count_score DECIMAL(5,2);
  v_category_coverage_score DECIMAL(5,2);
  v_population_coverage_score DECIMAL(5,2);
  v_verification_score DECIMAL(5,2);
  v_coverage_score DECIMAL(5,2);
  v_comprehensiveness_ratio DECIMAL(5,3);
  v_review_coverage_pct DECIMAL(5,2);
BEGIN
  -- ====================================
  -- Step 1: Gather resource metrics
  -- ====================================

  IF p_geography_type = 'national' THEN
    -- National metrics
    v_geography_name := 'United States';

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE last_verified >= NOW() - INTERVAL '90 days'),
      COUNT(DISTINCT primary_category),
      COUNT(*) FILTER (WHERE is_unique = true),
      AVG(completeness_score),
      AVG(verification_score),
      COUNT(*) FILTER (WHERE review_count > 0),
      COUNT(*) FILTER (WHERE also_in_211 = true)
    INTO
      v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
      v_avg_completeness, v_avg_verification, v_review_count, v_resources_in_211
    FROM resources
    WHERE status = 'active';

  ELSIF p_geography_type = 'state' THEN
    -- State metrics
    SELECT state_name INTO v_geography_name
    FROM county_data
    WHERE state_code = p_geography_id
    LIMIT 1;

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE last_verified >= NOW() - INTERVAL '90 days'),
      COUNT(DISTINCT primary_category),
      COUNT(*) FILTER (WHERE is_unique = true),
      AVG(completeness_score),
      AVG(verification_score),
      COUNT(*) FILTER (WHERE review_count > 0),
      COUNT(*) FILTER (WHERE also_in_211 = true)
    INTO
      v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
      v_avg_completeness, v_avg_verification, v_review_count, v_resources_in_211
    FROM resources
    WHERE status = 'active' AND state = p_geography_id;

  ELSIF p_geography_type = 'county' THEN
    -- County metrics
    SELECT county_name || ', ' || state_code, total_population, estimated_annual_releases
    INTO v_geography_name, v_total_population, v_reentry_population
    FROM county_data
    WHERE fips_code = p_geography_id;

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE last_verified >= NOW() - INTERVAL '90 days'),
      COUNT(DISTINCT primary_category),
      COUNT(*) FILTER (WHERE is_unique = true),
      AVG(completeness_score),
      AVG(verification_score),
      COUNT(*) FILTER (WHERE review_count > 0),
      COUNT(*) FILTER (WHERE also_in_211 = true)
    INTO
      v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
      v_avg_completeness, v_avg_verification, v_review_count, v_resources_in_211
    FROM resources
    WHERE status = 'active' AND county_fips = p_geography_id;

  ELSIF p_geography_type = 'city' THEN
    -- City metrics (city name passed as geography_id)
    v_geography_name := p_geography_id;

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE last_verified >= NOW() - INTERVAL '90 days'),
      COUNT(DISTINCT primary_category),
      COUNT(*) FILTER (WHERE is_unique = true),
      AVG(completeness_score),
      AVG(verification_score),
      COUNT(*) FILTER (WHERE review_count > 0),
      COUNT(*) FILTER (WHERE also_in_211 = true)
    INTO
      v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
      v_avg_completeness, v_avg_verification, v_review_count, v_resources_in_211
    FROM resources
    WHERE status = 'active' AND city = p_geography_id;
  END IF;

  -- ====================================
  -- Step 2: Calculate component scores
  -- ====================================

  v_resource_count_score := calculate_resource_count_score(v_resource_count);
  v_category_coverage_score := calculate_category_coverage_score(v_categories_covered);
  v_population_coverage_score := calculate_population_coverage_score(v_resource_count, v_reentry_population);
  v_verification_score := calculate_verification_score(v_verified_count, v_resource_count, COALESCE(v_avg_verification, 0.5));

  -- ====================================
  -- Step 3: Calculate composite score
  -- ====================================

  -- Weighted formula: 30% resource count + 30% category + 20% population + 20% verification
  v_coverage_score :=
    (v_resource_count_score * 0.30) +
    (v_category_coverage_score * 0.30) +
    (v_population_coverage_score * 0.20) +
    (v_verification_score * 0.20);

  -- ====================================
  -- Step 4: Calculate additional metrics
  -- ====================================

  -- Comprehensiveness ratio (our resources / 211 resources)
  IF v_resources_in_211 > 0 THEN
    v_comprehensiveness_ratio := v_resource_count::DECIMAL / v_resources_in_211;
  ELSE
    v_comprehensiveness_ratio := 0;
  END IF;

  -- Review coverage percentage
  IF v_resource_count > 0 THEN
    v_review_coverage_pct := (v_review_count::DECIMAL / v_resource_count) * 100;
  ELSE
    v_review_coverage_pct := 0;
  END IF;

  -- ====================================
  -- Step 5: Upsert metrics
  -- ====================================

  INSERT INTO coverage_metrics (
    geography_type,
    geography_id,
    geography_name,
    coverage_score,
    resource_count_score,
    category_coverage_score,
    population_coverage_score,
    verification_score,
    total_resources,
    verified_resources,
    categories_covered,
    unique_resources,
    total_population,
    reentry_population,
    resources_in_211,
    comprehensiveness_ratio,
    avg_completeness_score,
    avg_verification_score,
    resources_with_reviews,
    review_coverage_pct,
    calculated_at,
    last_updated
  ) VALUES (
    p_geography_type,
    p_geography_id,
    v_geography_name,
    v_coverage_score,
    v_resource_count_score,
    v_category_coverage_score,
    v_population_coverage_score,
    v_verification_score,
    v_resource_count,
    v_verified_count,
    v_categories_covered,
    v_unique_count,
    v_total_population,
    v_reentry_population,
    v_resources_in_211,
    v_comprehensiveness_ratio,
    v_avg_completeness,
    v_avg_verification,
    v_review_count,
    v_review_coverage_pct,
    NOW(),
    NOW()
  )
  ON CONFLICT (geography_type, geography_id)
  DO UPDATE SET
    geography_name = EXCLUDED.geography_name,
    coverage_score = EXCLUDED.coverage_score,
    resource_count_score = EXCLUDED.resource_count_score,
    category_coverage_score = EXCLUDED.category_coverage_score,
    population_coverage_score = EXCLUDED.population_coverage_score,
    verification_score = EXCLUDED.verification_score,
    total_resources = EXCLUDED.total_resources,
    verified_resources = EXCLUDED.verified_resources,
    categories_covered = EXCLUDED.categories_covered,
    unique_resources = EXCLUDED.unique_resources,
    total_population = EXCLUDED.total_population,
    reentry_population = EXCLUDED.reentry_population,
    resources_in_211 = EXCLUDED.resources_in_211,
    comprehensiveness_ratio = EXCLUDED.comprehensiveness_ratio,
    avg_completeness_score = EXCLUDED.avg_completeness_score,
    avg_verification_score = EXCLUDED.avg_verification_score,
    resources_with_reviews = EXCLUDED.resources_with_reviews,
    review_coverage_pct = EXCLUDED.review_coverage_pct,
    calculated_at = NOW(),
    last_updated = NOW();

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Convenience function: Recalculate all coverage metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_coverage()
RETURNS TABLE(geography_type TEXT, geography_id TEXT, coverage_score DECIMAL) AS $$
BEGIN
  -- Recalculate national
  PERFORM calculate_coverage_metrics('national', 'US');

  -- Recalculate all states with resources
  PERFORM calculate_coverage_metrics('state', state)
  FROM (SELECT DISTINCT state FROM resources WHERE status = 'active') AS states;

  -- Recalculate all counties with resources
  PERFORM calculate_coverage_metrics('county', county_fips)
  FROM (SELECT DISTINCT county_fips FROM resources WHERE status = 'active' AND county_fips IS NOT NULL) AS counties;

  -- Recalculate all cities with resources
  PERFORM calculate_coverage_metrics('city', city)
  FROM (SELECT DISTINCT city FROM resources WHERE status = 'active') AS cities;

  -- Return updated metrics
  RETURN QUERY
  SELECT
    cm.geography_type,
    cm.geography_id,
    cm.coverage_score
  FROM coverage_metrics cm
  ORDER BY cm.geography_type, cm.coverage_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION calculate_coverage_metrics IS 'Calculates comprehensive coverage score for a geographic region using weighted formula: 30% resource count + 30% category coverage + 20% population adequacy + 20% verification quality';
COMMENT ON FUNCTION recalculate_all_coverage IS 'Recalculates coverage metrics for all geographies with active resources';
