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
