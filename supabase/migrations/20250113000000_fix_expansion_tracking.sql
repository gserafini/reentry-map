-- ============================================================================
-- MIGRATION: Fix Expansion Priorities Tracking
-- ============================================================================
--
-- PROBLEM 1: resource_count field exists but is NEVER updated
-- PROBLEM 2: target_resource_count is hardcoded, should use per-capita formula
--
-- FIXES:
-- 1. Create trigger to auto-update resource_count when resources change
-- 2. Recalculate target_resource_count based on population (1 per 10k for "good" coverage)
-- 3. Update existing LA target from 100 → 1,320 (realistic for 13.2M population)
--
-- ============================================================================

-- ============================================================================
-- PART 0: Fix auto_calculate_priority_score to use 'population' not 'metro_population'
-- ============================================================================

-- This trigger was broken by migration 20250110000004 which renamed metro_population → population
-- but didn't update the trigger function or the calculate function

-- First fix the calculation function parameter
CREATE OR REPLACE FUNCTION calculate_expansion_priority_score(
  p_population INTEGER,
  p_state_release_volume INTEGER,
  p_data_availability_score INTEGER,
  p_geographic_cluster_bonus INTEGER,
  p_community_partner_count INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
BEGIN
  -- Metro population (0-300 points, normalized)
  IF p_population IS NOT NULL THEN
    v_score := v_score + LEAST(300, (p_population / 10000)::INTEGER);
  END IF;

  -- State release volume (0-250 points)
  IF p_state_release_volume IS NOT NULL THEN
    v_score := v_score + LEAST(250, (p_state_release_volume / 1000)::INTEGER);
  END IF;

  -- Data availability (0-200 points, direct)
  IF p_data_availability_score IS NOT NULL THEN
    v_score := v_score + (p_data_availability_score * 2);
  END IF;

  -- Geographic cluster bonus (0-100 points, direct)
  IF p_geographic_cluster_bonus IS NOT NULL THEN
    v_score := v_score + p_geographic_cluster_bonus;
  END IF;

  -- Community partner count (0-100 points, capped at 50 partners)
  IF p_community_partner_count IS NOT NULL THEN
    v_score := v_score + LEAST(100, p_community_partner_count * 2);
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Now fix the trigger function
CREATE OR REPLACE FUNCTION auto_calculate_priority_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if any of the input factors changed
  IF (TG_OP = 'INSERT' OR
      NEW.population IS DISTINCT FROM OLD.population OR
      NEW.state_release_volume IS DISTINCT FROM OLD.state_release_volume OR
      NEW.data_availability_score IS DISTINCT FROM OLD.data_availability_score OR
      NEW.geographic_cluster_bonus IS DISTINCT FROM OLD.geographic_cluster_bonus OR
      NEW.community_partner_count IS DISTINCT FROM OLD.community_partner_count) THEN

    NEW.priority_score := calculate_expansion_priority_score(
      NEW.population,
      NEW.state_release_volume,
      NEW.data_availability_score,
      NEW.geographic_cluster_bonus,
      NEW.community_partner_count
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 1: Create function to update expansion_priorities.resource_count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_expansion_resource_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the resource_count for matching city/state in expansion_priorities
  -- This runs after any INSERT, UPDATE, or DELETE on resources table

  UPDATE expansion_priorities
  SET
    resource_count = (
      SELECT COUNT(*)
      FROM resources
      WHERE
        city = expansion_priorities.city
        AND state = expansion_priorities.state
        AND status = 'active'
    ),
    updated_at = NOW()
  WHERE (city = NEW.city OR city = OLD.city)
    AND (state = NEW.state OR state = OLD.state);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: Create trigger on resources table
-- ============================================================================

CREATE TRIGGER update_expansion_counts_on_resource_change
  AFTER INSERT OR UPDATE OR DELETE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_expansion_resource_counts();

COMMENT ON TRIGGER update_expansion_counts_on_resource_change ON resources IS
'Auto-updates expansion_priorities.resource_count when resources are added/removed/updated. Keeps Command Center progress tracking in sync.';

-- ============================================================================
-- PART 3: Recalculate target_resource_count using per-capita formula
-- ============================================================================

-- Formula: 1 resource per 10,000 population = "good" coverage
-- This is a reasonable launch target (between "fair" and "excellent")

UPDATE expansion_priorities
SET target_resource_count = GREATEST(
  50,  -- Minimum 50 resources even for small cities
  ROUND(population / 10000.0)::INTEGER  -- 1 per 10k population
)
WHERE population IS NOT NULL AND population > 0;

-- For cities without population data, use phase-based defaults
UPDATE expansion_priorities
SET target_resource_count = CASE
  WHEN phase = 'phase_1' THEN 100
  WHEN phase = 'phase_2a' OR phase = 'phase_2b' THEN 75
  WHEN phase = 'phase_3a' OR phase = 'phase_3b' OR phase = 'phase_3c' THEN 60
  ELSE 50
END
WHERE population IS NULL OR population = 0;

-- ============================================================================
-- PART 4: Initial count population
-- ============================================================================

-- Populate current resource_count for all existing expansion_priorities
UPDATE expansion_priorities ep
SET resource_count = (
  SELECT COUNT(*)
  FROM resources r
  WHERE r.city = ep.city
    AND r.state = ep.state
    AND r.status = 'active'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show updated targets for Phase 1 cities
-- Expected: LA should now have target ~1,320 instead of 100

-- SELECT
--   city,
--   state,
--   population,
--   target_resource_count AS new_target,
--   resource_count AS current_count,
--   ROUND(100.0 * resource_count / NULLIF(target_resource_count, 0), 1) AS progress_pct
-- FROM expansion_priorities
-- WHERE phase = 'phase_1'
-- ORDER BY priority_score DESC;
