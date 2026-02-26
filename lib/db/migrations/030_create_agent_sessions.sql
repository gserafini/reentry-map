-- Migration 030: Create agent_sessions table
-- Fixes: PM2 error "relation agent_sessions does not exist"
-- Source: supabase/migrations/20250109000004_research_pipeline.sql
-- Part of Supabase migration gap audit (B009)

-- ============================================================================
-- agent_sessions: Tracks AI agent work sessions for monitoring and quality control
-- Used by: /admin dashboard stats, command center active sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent identification
  agent_type TEXT NOT NULL CHECK (agent_type IN ('research', 'verification', 'enrichment', 'discovery')),
  agent_id TEXT NOT NULL,

  -- Session details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Productivity metrics
  tasks_completed INTEGER DEFAULT 0,
  resources_processed INTEGER DEFAULT 0,
  approvals INTEGER DEFAULT 0,
  rejections INTEGER DEFAULT 0,

  -- Current task (optional FK - research_tasks may or may not exist)
  current_task_id UUID,

  -- Quality metrics
  verification_failures INTEGER DEFAULT 0,
  average_processing_time INTERVAL
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_active
  ON agent_sessions (agent_type, ended_at) WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent
  ON agent_sessions (agent_id, started_at DESC);

COMMENT ON TABLE agent_sessions IS 'Tracks agent work sessions for monitoring and quality control';
