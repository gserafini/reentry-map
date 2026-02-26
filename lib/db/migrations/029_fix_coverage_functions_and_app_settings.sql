-- Fix coverage calculation functions + create app_settings table
-- Addresses: coverage map stats not updating, settings page failing to load
-- Applied: 2026-02-26

-- ============================================================================
-- Part 1: Add unique constraint needed for ON CONFLICT in coverage functions
-- ============================================================================

-- Drop the non-unique index first, then create unique one
DROP INDEX IF EXISTS idx_coverage_metrics_geography;
CREATE UNIQUE INDEX idx_coverage_metrics_geography
  ON coverage_metrics (geography_type, geography_id);

-- ============================================================================
-- Part 2: Coverage calculation helper functions
-- (Fixed column names to match actual resources table)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_resource_count_score(
  p_resource_count INTEGER,
  p_target_count INTEGER DEFAULT 50
) RETURNS DECIMAL(5,2) AS $$
BEGIN
  RETURN LEAST(100, (p_resource_count::DECIMAL / GREATEST(p_target_count, 1)) * 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_category_coverage_score(
  p_categories_covered INTEGER,
  p_total_categories INTEGER DEFAULT 13
) RETURNS DECIMAL(5,2) AS $$
BEGIN
  RETURN (p_categories_covered::DECIMAL / GREATEST(p_total_categories, 1)) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_population_coverage_score(
  p_resource_count INTEGER,
  p_reentry_population INTEGER
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_resources_per_1000 DECIMAL(10,2);
BEGIN
  IF p_reentry_population IS NULL OR p_reentry_population = 0 THEN
    RETURN calculate_resource_count_score(p_resource_count);
  END IF;
  v_resources_per_1000 := (p_resource_count::DECIMAL / p_reentry_population) * 1000;
  RETURN LEAST(100, v_resources_per_1000 * 20);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_verification_score_fn(
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
  v_verification_rate := p_verified_count::DECIMAL / p_total_count;
  RETURN ((v_verification_rate * 50) + (COALESCE(p_avg_verification, 0.5) * 50));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Part 3: Main coverage calculation function
-- Fixed: last_verified -> last_verified_at
-- Fixed: completeness_score -> data_completeness_score
-- Fixed: verification_score -> ai_verification_score (in SELECT)
-- Fixed: calculate_verification_score -> calculate_verification_score_fn
--        (avoids conflict with coverage_metrics.verification_score column)
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
  v_verification_score_val DECIMAL(5,2);
  v_coverage_score DECIMAL(5,2);
  v_comprehensiveness_ratio DECIMAL(5,3);
  v_review_coverage_pct DECIMAL(5,2);
BEGIN
  -- Default population values
  v_total_population := NULL;
  v_reentry_population := NULL;

  IF p_geography_type = 'national' THEN
    v_geography_name := 'United States';

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE last_verified_at >= NOW() - INTERVAL '90 days'),
      COUNT(DISTINCT primary_category),
      COUNT(*) FILTER (WHERE is_unique = true),
      AVG(data_completeness_score),
      AVG(ai_verification_score),
      COUNT(*) FILTER (WHERE review_count > 0),
      COUNT(*) FILTER (WHERE also_in_211 = true)
    INTO
      v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
      v_avg_completeness, v_avg_verification, v_review_count, v_resources_in_211
    FROM resources
    WHERE status = 'active';

  ELSIF p_geography_type = 'state' THEN
    SELECT state_name INTO v_geography_name
    FROM county_data
    WHERE state_code = p_geography_id
    LIMIT 1;

    IF v_geography_name IS NULL THEN
      v_geography_name := p_geography_id;
    END IF;

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE last_verified_at >= NOW() - INTERVAL '90 days'),
      COUNT(DISTINCT primary_category),
      COUNT(*) FILTER (WHERE is_unique = true),
      AVG(data_completeness_score),
      AVG(ai_verification_score),
      COUNT(*) FILTER (WHERE review_count > 0),
      COUNT(*) FILTER (WHERE also_in_211 = true)
    INTO
      v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
      v_avg_completeness, v_avg_verification, v_review_count, v_resources_in_211
    FROM resources
    WHERE status = 'active' AND state = p_geography_id;

  ELSIF p_geography_type = 'county' THEN
    SELECT county_name || ', ' || state_code, total_population, estimated_annual_releases
    INTO v_geography_name, v_total_population, v_reentry_population
    FROM county_data
    WHERE fips_code = p_geography_id;

    IF v_geography_name IS NULL THEN
      v_geography_name := p_geography_id;
    END IF;

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE last_verified_at >= NOW() - INTERVAL '90 days'),
      COUNT(DISTINCT primary_category),
      COUNT(*) FILTER (WHERE is_unique = true),
      AVG(data_completeness_score),
      AVG(ai_verification_score),
      COUNT(*) FILTER (WHERE review_count > 0),
      COUNT(*) FILTER (WHERE also_in_211 = true)
    INTO
      v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
      v_avg_completeness, v_avg_verification, v_review_count, v_resources_in_211
    FROM resources
    WHERE status = 'active' AND county_fips = p_geography_id;

  ELSIF p_geography_type = 'city' THEN
    v_geography_name := p_geography_id;

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE last_verified_at >= NOW() - INTERVAL '90 days'),
      COUNT(DISTINCT primary_category),
      COUNT(*) FILTER (WHERE is_unique = true),
      AVG(data_completeness_score),
      AVG(ai_verification_score),
      COUNT(*) FILTER (WHERE review_count > 0),
      COUNT(*) FILTER (WHERE also_in_211 = true)
    INTO
      v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
      v_avg_completeness, v_avg_verification, v_review_count, v_resources_in_211
    FROM resources
    WHERE status = 'active' AND city = p_geography_id;
  END IF;

  -- Calculate component scores
  v_resource_count_score := calculate_resource_count_score(COALESCE(v_resource_count, 0));
  v_category_coverage_score := calculate_category_coverage_score(COALESCE(v_categories_covered, 0));
  v_population_coverage_score := calculate_population_coverage_score(COALESCE(v_resource_count, 0), v_reentry_population);
  v_verification_score_val := calculate_verification_score_fn(COALESCE(v_verified_count, 0), COALESCE(v_resource_count, 0), COALESCE(v_avg_verification, 0.5));

  -- Weighted composite: 30% resource + 30% category + 20% population + 20% verification
  v_coverage_score :=
    (v_resource_count_score * 0.30) +
    (v_category_coverage_score * 0.30) +
    (v_population_coverage_score * 0.20) +
    (v_verification_score_val * 0.20);

  -- Comprehensiveness ratio
  IF COALESCE(v_resources_in_211, 0) > 0 THEN
    v_comprehensiveness_ratio := v_resource_count::DECIMAL / v_resources_in_211;
  ELSE
    v_comprehensiveness_ratio := 0;
  END IF;

  -- Review coverage percentage
  IF COALESCE(v_resource_count, 0) > 0 THEN
    v_review_coverage_pct := (COALESCE(v_review_count, 0)::DECIMAL / v_resource_count) * 100;
  ELSE
    v_review_coverage_pct := 0;
  END IF;

  -- Upsert metrics
  INSERT INTO coverage_metrics (
    geography_type, geography_id, geography_name,
    coverage_score, resource_count_score, category_coverage_score,
    population_coverage_score, verification_score,
    total_resources, verified_resources, categories_covered, unique_resources,
    total_population, reentry_population, resources_in_211,
    comprehensiveness_ratio, avg_completeness_score, avg_verification_score,
    resources_with_reviews, review_coverage_pct,
    calculated_at, last_updated
  ) VALUES (
    p_geography_type, p_geography_id, v_geography_name,
    v_coverage_score, v_resource_count_score, v_category_coverage_score,
    v_population_coverage_score, v_verification_score_val,
    COALESCE(v_resource_count, 0), COALESCE(v_verified_count, 0),
    COALESCE(v_categories_covered, 0), COALESCE(v_unique_count, 0),
    v_total_population, v_reentry_population, COALESCE(v_resources_in_211, 0),
    v_comprehensiveness_ratio, v_avg_completeness, v_avg_verification,
    COALESCE(v_review_count, 0), v_review_coverage_pct,
    NOW(), NOW()
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
-- Part 4: Convenience function to recalculate all coverage
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_coverage()
RETURNS TABLE(geography_type TEXT, geography_id TEXT, coverage_score DOUBLE PRECISION) AS $$
BEGIN
  -- National
  PERFORM calculate_coverage_metrics('national', 'US');

  -- States
  PERFORM calculate_coverage_metrics('state', r.state)
  FROM (SELECT DISTINCT state FROM resources WHERE status = 'active' AND state IS NOT NULL) AS r;

  -- Counties
  PERFORM calculate_coverage_metrics('county', r.county_fips)
  FROM (SELECT DISTINCT county_fips FROM resources WHERE status = 'active' AND county_fips IS NOT NULL) AS r;

  -- Cities
  PERFORM calculate_coverage_metrics('city', r.city)
  FROM (SELECT DISTINCT city FROM resources WHERE status = 'active' AND city IS NOT NULL) AS r;

  RETURN QUERY
  SELECT cm.geography_type, cm.geography_id, cm.coverage_score
  FROM coverage_metrics cm
  ORDER BY cm.geography_type, cm.coverage_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 5: Create app_settings table (for admin settings page)
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_auth_enabled BOOLEAN DEFAULT FALSE,
  sms_provider_configured BOOLEAN DEFAULT FALSE,
  ai_master_enabled BOOLEAN DEFAULT FALSE,
  ai_verification_enabled BOOLEAN DEFAULT FALSE,
  ai_discovery_enabled BOOLEAN DEFAULT FALSE,
  ai_enrichment_enabled BOOLEAN DEFAULT FALSE,
  ai_realtime_monitoring_enabled BOOLEAN DEFAULT TRUE,
  support_email TEXT,
  support_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only insert if table is empty
INSERT INTO app_settings (
  sms_auth_enabled, sms_provider_configured,
  ai_master_enabled, ai_verification_enabled, ai_discovery_enabled,
  ai_enrichment_enabled, ai_realtime_monitoring_enabled,
  support_email
)
SELECT
  FALSE, FALSE,
  FALSE, FALSE, FALSE,
  FALSE, TRUE,
  'support@reentrymap.org'
WHERE NOT EXISTS (SELECT 1 FROM app_settings);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_app_settings_timestamp ON app_settings;
CREATE TRIGGER update_app_settings_timestamp
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION calculate_coverage_metrics IS 'Calculates coverage score for a geographic region: 30% resource count + 30% category coverage + 20% population + 20% verification';
COMMENT ON FUNCTION recalculate_all_coverage IS 'Recalculates coverage metrics for all geographies with active resources';
COMMENT ON TABLE app_settings IS 'Application-wide settings and feature flags';
