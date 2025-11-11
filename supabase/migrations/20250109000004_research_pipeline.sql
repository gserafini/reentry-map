-- Migration: Research & Verification Pipeline
-- Created: 2025-01-09
-- Purpose: Systematic county expansion, research tasks, multi-agent coordination

-- ============================================================================
-- PART 1: County Coverage Tracking
-- ============================================================================

CREATE TABLE county_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county TEXT NOT NULL,
  state TEXT NOT NULL,

  -- Geographic data
  population INTEGER,
  fips_code TEXT, -- Federal Information Processing Standards code

  -- Coverage metrics
  resource_count INTEGER DEFAULT 0,
  coverage_score DECIMAL(5,2), -- 0-100 score based on population/resources ratio

  -- Prioritization
  priority INTEGER DEFAULT 50, -- 1-100, higher = more important
  priority_reason TEXT, -- Why this county is prioritized

  -- Research status
  status TEXT DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'researching',
    'initial_coverage',  -- Has some resources
    'good_coverage',     -- Meeting targets
    'excellent_coverage' -- Exceeds targets
  )),

  -- Target goals
  target_resource_count INTEGER DEFAULT 50,

  -- Timestamps
  last_research_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(county, state)
);

CREATE INDEX idx_county_coverage_priority ON county_coverage (priority DESC, coverage_score ASC);
CREATE INDEX idx_county_coverage_status ON county_coverage (status);

COMMENT ON TABLE county_coverage IS 'Tracks resource coverage by county for expansion planning';
COMMENT ON COLUMN county_coverage.coverage_score IS 'Calculated: (resource_count / target_resource_count) * 100';
COMMENT ON COLUMN county_coverage.priority IS 'Manual priority 1-100 based on population, need, strategic importance';

-- ============================================================================
-- PART 2: Research Tasks Queue
-- ============================================================================

CREATE TABLE research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task definition
  county TEXT NOT NULL,
  state TEXT NOT NULL,
  category TEXT, -- NULL = all categories
  target_count INTEGER DEFAULT 20, -- How many resources to find

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Waiting to be picked up
    'in_progress',  -- Agent is working on it
    'completed',    -- Target reached
    'paused',       -- Paused (waiting for human review, etc.)
    'cancelled'     -- No longer needed
  )),

  -- Assignment
  assigned_to TEXT, -- Agent ID or 'api_key' for Claude Code
  assigned_at TIMESTAMPTZ,

  -- Progress
  resources_found INTEGER DEFAULT 0,
  resources_published INTEGER DEFAULT 0,

  -- Instructions for agent
  search_instructions TEXT, -- "Search for food pantries, soup kitchens, meal programs"
  search_queries TEXT[], -- Suggested search queries

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Priority
  priority INTEGER DEFAULT 50 -- Inherit from county_coverage
);

CREATE INDEX idx_research_tasks_status ON research_tasks (status, priority DESC);
CREATE INDEX idx_research_tasks_assigned ON research_tasks (assigned_to, status);
CREATE INDEX idx_research_tasks_county ON research_tasks (county, state);

COMMENT ON TABLE research_tasks IS 'Queue of research tasks for discovery agents';
COMMENT ON COLUMN research_tasks.search_instructions IS 'Human-readable instructions for what to research';
COMMENT ON COLUMN research_tasks.search_queries IS 'Example search queries to help agent get started';

-- ============================================================================
-- PART 3: Agent Activity Tracking
-- ============================================================================

CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent identification
  agent_type TEXT NOT NULL CHECK (agent_type IN ('research', 'verification')),
  agent_id TEXT NOT NULL, -- 'api_key', user_id, or custom identifier

  -- Session details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Productivity metrics
  tasks_completed INTEGER DEFAULT 0,
  resources_processed INTEGER DEFAULT 0,
  approvals INTEGER DEFAULT 0,
  rejections INTEGER DEFAULT 0,

  -- Current task
  current_task_id UUID REFERENCES research_tasks(id),

  -- Quality metrics
  verification_failures INTEGER DEFAULT 0, -- Times validation was rejected
  average_processing_time INTERVAL -- Average time per resource
);

CREATE INDEX idx_agent_sessions_active ON agent_sessions (agent_type, ended_at) WHERE ended_at IS NULL;
CREATE INDEX idx_agent_sessions_agent ON agent_sessions (agent_id, started_at DESC);

COMMENT ON TABLE agent_sessions IS 'Tracks agent work sessions for monitoring and quality control';

-- ============================================================================
-- PART 4: Update resource_suggestions for research tracking
-- ============================================================================

-- Add research task reference to know which task this came from
ALTER TABLE resource_suggestions
  ADD COLUMN research_task_id UUID REFERENCES research_tasks(id);

-- Add source tracking
ALTER TABLE resource_suggestions
  ADD COLUMN discovered_via TEXT; -- 'websearch', 'webfetch', 'manual', 'import'

-- Add discovery notes
ALTER TABLE resource_suggestions
  ADD COLUMN discovery_notes TEXT; -- What search query found this, etc.

CREATE INDEX idx_resource_suggestions_research_task ON resource_suggestions (research_task_id);

COMMENT ON COLUMN resource_suggestions.research_task_id IS 'Links suggestion to the research task that discovered it';
COMMENT ON COLUMN resource_suggestions.discovered_via IS 'How this resource was discovered (websearch, webfetch, manual)';
COMMENT ON COLUMN resource_suggestions.discovery_notes IS 'Search query used, URL found at, etc.';

-- ============================================================================
-- PART 5: Triggers for auto-updating metrics
-- ============================================================================

-- Update county_coverage resource_count when resources are published
CREATE OR REPLACE FUNCTION update_county_coverage_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update resource_count for this county
  UPDATE county_coverage
  SET
    resource_count = (
      SELECT COUNT(*)
      FROM resources
      WHERE city = county_coverage.county
        AND state = county_coverage.state
        AND status = 'active'
    ),
    coverage_score = (
      SELECT ROUND(
        100.0 * COUNT(*) / NULLIF(target_resource_count, 0),
        2
      )
      FROM resources
      WHERE city = county_coverage.county
        AND state = county_coverage.state
        AND status = 'active'
    ),
    updated_at = NOW()
  WHERE (county = NEW.city OR county = OLD.city)
    AND (state = NEW.state OR state = OLD.state);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_county_metrics_on_resource_change
  AFTER INSERT OR UPDATE OR DELETE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_county_coverage_metrics();

-- Update research_tasks progress when suggestions are created
CREATE OR REPLACE FUNCTION update_research_task_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.research_task_id IS NOT NULL THEN
    UPDATE research_tasks
    SET
      resources_found = (
        SELECT COUNT(*)
        FROM resource_suggestions
        WHERE research_task_id = NEW.research_task_id
      ),
      resources_published = (
        SELECT COUNT(*)
        FROM resource_suggestions
        WHERE research_task_id = NEW.research_task_id
          AND status = 'approved'
      ),
      updated_at = NOW()
    WHERE id = NEW.research_task_id;

    -- Auto-complete task if target reached
    UPDATE research_tasks
    SET
      status = 'completed',
      completed_at = NOW()
    WHERE id = NEW.research_task_id
      AND resources_published >= target_count
      AND status = 'in_progress';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_research_progress_on_suggestion
  AFTER INSERT OR UPDATE ON resource_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_research_task_progress();

-- ============================================================================
-- PART 6: Seed Bay Area counties
-- ============================================================================

INSERT INTO county_coverage (county, state, population, priority, priority_reason, target_resource_count) VALUES
  -- Core coverage (already started)
  ('Alameda', 'CA', 1671329, 100, 'Primary service area - Oakland, Berkeley, Hayward', 150),

  -- High priority expansion
  ('Contra Costa', 'CA', 1165927, 90, 'Adjacent county, high population, similar demographics', 100),
  ('Santa Clara', 'CA', 1936259, 90, 'Largest Bay Area county by population', 120),
  ('San Francisco', 'CA', 873965, 85, 'Urban center, high need, significant reentry population', 100),
  ('San Mateo', 'CA', 764442, 80, 'Adjacent to SF and Santa Clara, good coverage needed', 80),

  -- Medium priority
  ('Solano', 'CA', 453491, 70, 'Adjacent to Contra Costa, growing reentry services', 60),
  ('Sonoma', 'CA', 488863, 65, 'North Bay coverage, some rural areas', 50),
  ('Marin', 'CA', 262321, 60, 'Smaller population but strategic location', 40),
  ('Napa', 'CA', 138019, 50, 'Smallest Bay Area county, lower priority', 30)

ON CONFLICT (county, state) DO NOTHING;

-- ============================================================================
-- PART 7: Views for agent coordination
-- ============================================================================

-- View: Next research task for discovery agents
CREATE OR REPLACE VIEW next_research_task AS
SELECT
  rt.*,
  cc.coverage_score,
  cc.resource_count as current_coverage
FROM research_tasks rt
LEFT JOIN county_coverage cc ON rt.county = cc.county AND rt.state = cc.state
WHERE rt.status = 'pending'
ORDER BY rt.priority DESC, rt.created_at ASC
LIMIT 1;

COMMENT ON VIEW next_research_task IS 'Next research task to be picked up by a discovery agent';

-- View: County expansion priorities (what to research next)
CREATE OR REPLACE VIEW county_expansion_priorities AS
SELECT
  cc.*,
  COALESCE(
    (SELECT COUNT(*) FROM research_tasks WHERE county = cc.county AND state = cc.state AND status IN ('pending', 'in_progress')),
    0
  ) as active_research_tasks,
  COALESCE(
    (SELECT SUM(target_count - resources_found) FROM research_tasks WHERE county = cc.county AND state = cc.state AND status = 'in_progress'),
    0
  ) as remaining_research_targets
FROM county_coverage cc
WHERE cc.status != 'excellent_coverage'
ORDER BY cc.priority DESC, cc.coverage_score ASC;

COMMENT ON VIEW county_expansion_priorities IS 'Counties prioritized for expansion, ordered by strategic importance and current coverage gaps';

-- View: Agent performance metrics
CREATE OR REPLACE VIEW agent_performance AS
SELECT
  agent_id,
  agent_type,
  COUNT(*) as total_sessions,
  SUM(tasks_completed) as total_tasks,
  SUM(resources_processed) as total_resources,
  SUM(approvals) as total_approvals,
  SUM(rejections) as total_rejections,
  ROUND(100.0 * SUM(approvals) / NULLIF(SUM(approvals) + SUM(rejections), 0), 1) as approval_rate,
  AVG(EXTRACT(EPOCH FROM average_processing_time)) as avg_seconds_per_resource
FROM agent_sessions
WHERE ended_at IS NOT NULL
GROUP BY agent_id, agent_type
ORDER BY total_resources DESC;

COMMENT ON VIEW agent_performance IS 'Performance metrics for all agents (research and verification)';
