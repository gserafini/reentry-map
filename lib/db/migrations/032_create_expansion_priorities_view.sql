-- Create expansion_priorities_with_progress view
-- This view was in the original Supabase schema but was not migrated during
-- the self-hosted cutover. The API GET /api/admin/expansion-priorities depends on it.

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

COMMENT ON VIEW expansion_priorities_with_progress IS 'Helper view that includes calculated progress percentages and milestone counts for each expansion priority';
