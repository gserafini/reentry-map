-- Expansion Priorities System
-- Tracks and prioritizes geographic expansion for research pipeline and AI agents
-- Admin-facing tool for managing nationwide expansion strategy

-- ============================================================================
-- EXPANSION PRIORITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS expansion_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic Info
  city TEXT NOT NULL,
  state TEXT NOT NULL, -- Two-letter state code (CA, NY, TX, etc.)
  county TEXT,
  metro_area TEXT, -- e.g., "San Francisco Bay Area", "Greater Los Angeles"
  region TEXT CHECK (region IN ('northeast', 'southeast', 'midwest', 'southwest', 'west')),

  -- Priority Scoring (all nullable, calculated by admin or algorithm)
  priority_score INTEGER DEFAULT 0, -- Composite score 0-1000
  priority_tier TEXT CHECK (priority_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4')) DEFAULT 'tier_3',

  -- Ranking Factors (from GEOGRAPHIC_EXPANSION_STRATEGY.md algorithm)
  metro_population INTEGER, -- Total metro area population
  state_release_volume INTEGER, -- Annual releases from state prisons
  incarceration_rate INTEGER, -- Per 100k residents
  existing_resources_count INTEGER DEFAULT 0, -- How many resources we already have
  geographic_cluster_bonus INTEGER DEFAULT 0, -- 0-100, higher if near existing coverage
  data_availability_score INTEGER DEFAULT 0, -- 0-100, based on 211/govt data
  community_partner_count INTEGER DEFAULT 0, -- Number of known reentry orgs

  -- Status & Timeline
  status TEXT NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified', 'researching', 'ready_for_launch', 'launched', 'deferred', 'rejected')),
  phase TEXT, -- 'phase_1', 'phase_2a', 'phase_2b', etc. (matches GEOGRAPHIC_EXPANSION_STRATEGY.md)
  target_launch_date DATE,
  actual_launch_date DATE,

  -- Research Pipeline Integration
  research_status TEXT DEFAULT 'not_started'
    CHECK (research_status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  research_agent_assigned_at TIMESTAMPTZ,
  research_agent_completed_at TIMESTAMPTZ,
  research_notes TEXT,

  -- Resource Goals
  target_resource_count INTEGER DEFAULT 50, -- Minimum resources before launch
  current_resource_count INTEGER DEFAULT 0, -- Tracks progress

  -- Category Priorities (JSON array of category priorities for this location)
  priority_categories JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"category": "employment", "priority": "high", "target_count": 15}, ...]

  -- Data Sources
  data_sources JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"name": "211 San Diego", "url": "https://...", "quality": "high"}, ...]

  -- Strategic Notes
  strategic_rationale TEXT, -- Why prioritize this location
  blockers TEXT, -- What's preventing research/launch
  special_considerations TEXT, -- Language needs, unique service gaps, etc.

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  launched_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(city, state)
);

-- Indexes
CREATE INDEX idx_expansion_priorities_status ON expansion_priorities(status);
CREATE INDEX idx_expansion_priorities_priority_score ON expansion_priorities(priority_score DESC);
CREATE INDEX idx_expansion_priorities_phase ON expansion_priorities(phase);
CREATE INDEX idx_expansion_priorities_state ON expansion_priorities(state);
CREATE INDEX idx_expansion_priorities_research_status ON expansion_priorities(research_status);
CREATE INDEX idx_expansion_priorities_target_launch ON expansion_priorities(target_launch_date) WHERE target_launch_date IS NOT NULL;

-- Full-text search on city/metro/rationale
CREATE INDEX idx_expansion_priorities_search ON expansion_priorities
  USING GIN (to_tsvector('english', city || ' ' || metro_area || ' ' || COALESCE(strategic_rationale, '')));

-- ============================================================================
-- EXPANSION MILESTONES TABLE (tracks progress markers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS expansion_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expansion_id UUID NOT NULL REFERENCES expansion_priorities(id) ON DELETE CASCADE,

  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
    'research_started',
    'research_completed',
    'resources_50_reached',
    'resources_100_reached',
    'ready_for_review',
    'approved_for_launch',
    'launched',
    'resources_verified'
  )),

  milestone_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  achieved_by UUID REFERENCES auth.users(id), -- Admin or agent that achieved milestone
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expansion_milestones_expansion_id ON expansion_milestones(expansion_id);
CREATE INDEX idx_expansion_milestones_type ON expansion_milestones(milestone_type);
CREATE INDEX idx_expansion_milestones_date ON expansion_milestones(milestone_date DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expansion_priorities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expansion_priorities_updated_at
  BEFORE UPDATE ON expansion_priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_expansion_priorities_updated_at();

-- Calculate priority score automatically (simplified algorithm)
CREATE OR REPLACE FUNCTION calculate_expansion_priority_score(
  p_metro_population INTEGER,
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
  IF p_metro_population IS NOT NULL THEN
    v_score := v_score + LEAST(300, (p_metro_population / 10000)::INTEGER);
  END IF;

  -- State release volume (0-250 points)
  IF p_state_release_volume IS NOT NULL THEN
    v_score := v_score + LEAST(250, (p_state_release_volume / 1000)::INTEGER);
  END IF;

  -- Data availability (0-200 points, direct)
  IF p_data_availability_score IS NOT NULL THEN
    v_score := v_score + (p_data_availability_score * 2);
  END IF;

  -- Geographic clustering (0-150 points, direct)
  IF p_geographic_cluster_bonus IS NOT NULL THEN
    v_score := v_score + (p_geographic_cluster_bonus * 1.5)::INTEGER;
  END IF;

  -- Community partners (0-100 points, 10 pts per partner, max 10 partners)
  IF p_community_partner_count IS NOT NULL THEN
    v_score := v_score + LEAST(100, p_community_partner_count * 10);
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-calculate priority score on insert/update
CREATE OR REPLACE FUNCTION auto_calculate_priority_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if any of the input factors changed
  IF (TG_OP = 'INSERT' OR
      NEW.metro_population IS DISTINCT FROM OLD.metro_population OR
      NEW.state_release_volume IS DISTINCT FROM OLD.state_release_volume OR
      NEW.data_availability_score IS DISTINCT FROM OLD.data_availability_score OR
      NEW.geographic_cluster_bonus IS DISTINCT FROM OLD.geographic_cluster_bonus OR
      NEW.community_partner_count IS DISTINCT FROM OLD.community_partner_count) THEN

    NEW.priority_score := calculate_expansion_priority_score(
      NEW.metro_population,
      NEW.state_release_volume,
      NEW.data_availability_score,
      NEW.geographic_cluster_bonus,
      NEW.community_partner_count
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_priority_score_trigger
  BEFORE INSERT OR UPDATE ON expansion_priorities
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_priority_score();

-- Auto-create milestone when status changes to 'launched'
CREATE OR REPLACE FUNCTION create_launch_milestone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'launched' AND (TG_OP = 'INSERT' OR OLD.status != 'launched') THEN
    INSERT INTO expansion_milestones (
      expansion_id,
      milestone_type,
      milestone_date,
      notes,
      achieved_by
    ) VALUES (
      NEW.id,
      'launched',
      COALESCE(NEW.actual_launch_date, now()),
      'Location launched and available to users',
      NEW.launched_by
    );

    -- Set actual launch date if not already set
    IF NEW.actual_launch_date IS NULL THEN
      NEW.actual_launch_date := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_launch_milestone_trigger
  BEFORE UPDATE ON expansion_priorities
  FOR EACH ROW
  EXECUTE FUNCTION create_launch_milestone();

-- ============================================================================
-- ROW LEVEL SECURITY (Admin-only access)
-- ============================================================================

ALTER TABLE expansion_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE expansion_milestones ENABLE ROW LEVEL SECURITY;

-- Only admins can read expansion priorities
CREATE POLICY "Admins can view expansion priorities"
  ON expansion_priorities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Only admins can modify expansion priorities
CREATE POLICY "Admins can modify expansion priorities"
  ON expansion_priorities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Same policies for milestones
CREATE POLICY "Admins can view expansion milestones"
  ON expansion_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can modify expansion milestones"
  ON expansion_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View with calculated progress percentages
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

-- Comment on tables
COMMENT ON TABLE expansion_priorities IS 'Admin tool for tracking and prioritizing geographic expansion. Used by research pipeline and AI agents to determine where to expand next.';
COMMENT ON TABLE expansion_milestones IS 'Tracks progress milestones for each expansion location (research started, resources reached, launched, etc.)';
COMMENT ON COLUMN expansion_priorities.priority_score IS 'Composite score (0-1000) calculated from population, release volume, data availability, clustering, and partners';
COMMENT ON COLUMN expansion_priorities.phase IS 'Maps to phases in GEOGRAPHIC_EXPANSION_STRATEGY.md (phase_1, phase_2a, etc.)';
COMMENT ON COLUMN expansion_priorities.research_status IS 'Tracks AI agent research progress: not_started, in_progress, completed, blocked';