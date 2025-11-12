-- Fix expansion_priorities_with_progress view column name mismatch
-- The base table has 'population' but view was returning 'metro_population'
-- Frontend TypeScript expects 'population' to match the base table

-- Drop and recreate the view with correct column names
DROP VIEW IF EXISTS expansion_priorities_with_progress;

CREATE OR REPLACE VIEW expansion_priorities_with_progress AS
SELECT
  ep.*,
  CASE
    WHEN ep.target_resource_count > 0
    THEN ROUND((ep.current_resource_count::NUMERIC / ep.target_resource_count) * 100, 1)
    ELSE 0
  END AS progress_percentage,
  COUNT(em.id) AS milestone_count,
  MAX(em.milestone_date) AS last_milestone_date
FROM expansion_priorities ep
LEFT JOIN expansion_milestones em ON em.expansion_id = ep.id
GROUP BY ep.id;

-- Grant permissions
GRANT SELECT ON expansion_priorities_with_progress TO authenticated;

COMMENT ON VIEW expansion_priorities_with_progress IS 'Helper view that includes calculated progress percentages and milestone counts for each expansion priority';
