-- ============================================================================
-- COMBINED MIGRATION: Research Pipeline + Verification Tracking
-- Date: 2025-01-09
-- Purpose: Enable multi-agent research/verification workflow
-- ============================================================================
--
-- Run this entire file in Supabase SQL Editor:
-- https://app.supabase.com/project/scvshbntarpyjvdexpmp/sql
--
-- This migration enables:
-- 1. Non-addressed resources (hotlines, online, confidential)
-- 2. Verification source tracking
-- 3. Research task queue
-- 4. County expansion prioritization
-- 5. Agent activity tracking
-- ============================================================================

-- ============================================================================
-- STEP 1: Support non-addressed resources
-- ============================================================================

-- Make coordinates nullable
ALTER TABLE resources
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- Add address types
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS address_type TEXT DEFAULT 'physical' CHECK (address_type IN (
    'physical', 'confidential', 'regional', 'online', 'mobile'
  ));

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS service_area JSONB;

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS closure_status TEXT CHECK (closure_status IN ('temporary', 'permanent', NULL));

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS correction_notes TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resources_service_area ON resources USING GIN (service_area);
CREATE INDEX IF NOT EXISTS idx_resources_address_type ON resources (address_type);
CREATE INDEX IF NOT EXISTS idx_resources_closure_status ON resources (closure_status) WHERE closure_status IS NOT NULL;

-- ============================================================================
-- STEP 2: Add verification tracking to resources
-- ============================================================================

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS verification_source TEXT;

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS verified_by TEXT;

CREATE INDEX IF NOT EXISTS idx_resources_last_verified ON resources (last_verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_verification_source ON resources (verification_source) WHERE verification_source IS NOT NULL;

-- Set last_verified_at for existing resources
UPDATE resources
SET last_verified_at = created_at
WHERE last_verified_at IS NULL;

-- ============================================================================
-- STEP 3: Update resource_suggestions schema
-- ============================================================================

-- Add needs_attention status
ALTER TABLE resource_suggestions
  DROP CONSTRAINT IF EXISTS resource_suggestions_status_check;

ALTER TABLE resource_suggestions
  ADD CONSTRAINT resource_suggestions_status_check CHECK (status IN (
    'pending', 'approved', 'rejected', 'needs_attention'
  ));

-- Add structured rejection reasons
ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT CHECK (rejection_reason IN (
    'duplicate', 'wrong_service_type', 'permanently_closed', 'does_not_exist',
    'wrong_location', 'spam', 'insufficient_info', 'wrong_name',
    'incomplete_address', 'temporarily_closed', 'needs_verification',
    'confidential_address', 'missing_details'
  ));

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS closure_status TEXT CHECK (closure_status IN ('temporary', 'permanent', NULL));

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS correction_notes TEXT;

-- Add research tracking fields
ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS research_task_id UUID;

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS discovered_via TEXT;

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS discovery_notes TEXT;

-- ============================================================================
-- STEP 4: County coverage tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS county_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county TEXT NOT NULL,
  state TEXT NOT NULL,
  population INTEGER,
  fips_code TEXT,
  resource_count INTEGER DEFAULT 0,
  coverage_score DECIMAL(5,2),
  priority INTEGER DEFAULT 50,
  priority_reason TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'researching', 'initial_coverage',
    'good_coverage', 'excellent_coverage'
  )),
  target_resource_count INTEGER DEFAULT 50,
  last_research_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(county, state)
);

CREATE INDEX IF NOT EXISTS idx_county_coverage_priority ON county_coverage (priority DESC, coverage_score ASC);
CREATE INDEX IF NOT EXISTS idx_county_coverage_status ON county_coverage (status);

-- ============================================================================
-- STEP 5: Research tasks queue
-- ============================================================================

CREATE TABLE IF NOT EXISTS research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county TEXT NOT NULL,
  state TEXT NOT NULL,
  category TEXT,
  target_count INTEGER DEFAULT 20,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'paused', 'cancelled'
  )),
  assigned_to TEXT,
  assigned_at TIMESTAMPTZ,
  resources_found INTEGER DEFAULT 0,
  resources_published INTEGER DEFAULT 0,
  search_instructions TEXT,
  search_queries TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  priority INTEGER DEFAULT 50
);

CREATE INDEX IF NOT EXISTS idx_research_tasks_status ON research_tasks (status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_research_tasks_assigned ON research_tasks (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_research_tasks_county ON research_tasks (county, state);

-- Link research_tasks to resource_suggestions
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_research_task ON resource_suggestions (research_task_id);

-- Add foreign key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'resource_suggestions_research_task_id_fkey'
  ) THEN
    ALTER TABLE resource_suggestions
      ADD CONSTRAINT resource_suggestions_research_task_id_fkey
      FOREIGN KEY (research_task_id) REFERENCES research_tasks(id);
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Agent activity tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('research', 'verification')),
  agent_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  tasks_completed INTEGER DEFAULT 0,
  resources_processed INTEGER DEFAULT 0,
  approvals INTEGER DEFAULT 0,
  rejections INTEGER DEFAULT 0,
  current_task_id UUID,
  verification_failures INTEGER DEFAULT 0,
  average_processing_time INTERVAL
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_active ON agent_sessions (agent_type, ended_at) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions (agent_id, started_at DESC);

-- Add foreign key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'agent_sessions_current_task_id_fkey'
  ) THEN
    ALTER TABLE agent_sessions
      ADD CONSTRAINT agent_sessions_current_task_id_fkey
      FOREIGN KEY (current_task_id) REFERENCES research_tasks(id);
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Triggers for auto-updating metrics
-- ============================================================================

-- Update county_coverage when resources change
CREATE OR REPLACE FUNCTION update_county_coverage_metrics()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS update_county_metrics_on_resource_change ON resources;
CREATE TRIGGER update_county_metrics_on_resource_change
  AFTER INSERT OR UPDATE OR DELETE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_county_coverage_metrics();

-- Update research_tasks progress
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

DROP TRIGGER IF EXISTS update_research_progress_on_suggestion ON resource_suggestions;
CREATE TRIGGER update_research_progress_on_suggestion
  AFTER INSERT OR UPDATE ON resource_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_research_task_progress();

-- Auto-update last_verified_at when contact info changes
CREATE OR REPLACE FUNCTION update_last_verified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.address IS DISTINCT FROM OLD.address OR
    NEW.phone IS DISTINCT FROM OLD.phone OR
    NEW.email IS DISTINCT FROM OLD.email OR
    NEW.website IS DISTINCT FROM OLD.website OR
    NEW.hours IS DISTINCT FROM OLD.hours OR
    NEW.services_offered IS DISTINCT FROM OLD.services_offered
  ) THEN
    NEW.last_verified_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_resource_verification_timestamp ON resources;
CREATE TRIGGER update_resource_verification_timestamp
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_last_verified_timestamp();

-- ============================================================================
-- STEP 8: Seed Bay Area county data
-- ============================================================================

INSERT INTO county_coverage (county, state, population, priority, priority_reason, target_resource_count) VALUES
  ('Alameda', 'CA', 1671329, 100, 'Primary service area - Oakland, Berkeley, Hayward', 150),
  ('Contra Costa', 'CA', 1165927, 90, 'Adjacent county, high population, similar demographics', 100),
  ('Santa Clara', 'CA', 1936259, 90, 'Largest Bay Area county by population', 120),
  ('San Francisco', 'CA', 873965, 85, 'Urban center, high need, significant reentry population', 100),
  ('San Mateo', 'CA', 764442, 80, 'Adjacent to SF and Santa Clara, good coverage needed', 80),
  ('Solano', 'CA', 453491, 70, 'Adjacent to Contra Costa, growing reentry services', 60),
  ('Sonoma', 'CA', 488863, 65, 'North Bay coverage, some rural areas', 50),
  ('Marin', 'CA', 262321, 60, 'Smaller population but strategic location', 40),
  ('Napa', 'CA', 138019, 50, 'Smallest Bay Area county, lower priority', 30)
ON CONFLICT (county, state) DO NOTHING;

-- ============================================================================
-- COMPLETED! Next steps:
-- 1. Restart dev server: killall -9 node && rm -rf .next && npm run dev
-- 2. Test APIs: GET /api/research/next and GET /api/verification/next
-- ============================================================================
