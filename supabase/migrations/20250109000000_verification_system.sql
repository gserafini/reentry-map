-- Autonomous AI Verification System
-- This migration adds support for multi-agent autonomous verification of resources
-- with adversarial checking, provenance tracking, and field-level verification cadence

-- Expand resource_suggestions table to match resources table fields
-- This enables full verification without parsing JSON from reason field
ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS hours JSONB,
  ADD COLUMN IF NOT EXISTS services_offered TEXT[],
  ADD COLUMN IF NOT EXISTS eligibility_requirements TEXT,
  ADD COLUMN IF NOT EXISTS required_documents TEXT[],
  ADD COLUMN IF NOT EXISTS fees TEXT,
  ADD COLUMN IF NOT EXISTS languages TEXT[],
  ADD COLUMN IF NOT EXISTS accessibility_features TEXT[],
  ADD COLUMN IF NOT EXISTS primary_category TEXT,
  ADD COLUMN IF NOT EXISTS categories TEXT[],
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add verification tracking columns to resources table
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS verification_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_verification_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'flagged', 'rejected')),
  ADD COLUMN IF NOT EXISTS verification_confidence DECIMAL(3,2) CHECK (verification_confidence >= 0 AND verification_confidence <= 1),
  ADD COLUMN IF NOT EXISTS human_review_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS provenance JSONB;

-- Create verification_logs table to track all verification attempts
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES resource_suggestions(id) ON DELETE SET NULL,

  -- Verification metadata
  verification_type TEXT NOT NULL CHECK (verification_type IN ('initial', 'periodic', 'triggered')),
  agent_version TEXT NOT NULL,

  -- Results
  overall_score DECIMAL(3,2) CHECK (overall_score >= 0 AND overall_score <= 1),
  checks_performed JSONB NOT NULL DEFAULT '{}'::jsonb,
  conflicts_found JSONB DEFAULT '[]'::jsonb,
  changes_detected JSONB DEFAULT '[]'::jsonb,

  -- Decision
  decision TEXT NOT NULL CHECK (decision IN ('auto_approve', 'flag_for_human', 'auto_reject')),
  decision_reason TEXT,
  auto_approved BOOLEAN DEFAULT false,
  human_reviewed BOOLEAN DEFAULT false,
  human_reviewer_id UUID REFERENCES users(id),
  human_decision TEXT,
  human_notes TEXT,

  -- Performance tracking
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  api_calls_made INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10,4),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_resources_verification_status ON resources(verification_status);
CREATE INDEX IF NOT EXISTS idx_resources_next_verification ON resources(next_verification_at) WHERE verification_status = 'verified';
CREATE INDEX IF NOT EXISTS idx_resources_human_review ON resources(human_review_required) WHERE human_review_required = true;

CREATE INDEX IF NOT EXISTS idx_verification_logs_resource ON verification_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_suggestion ON verification_logs(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_decision ON verification_logs(decision);
CREATE INDEX IF NOT EXISTS idx_verification_logs_human_review ON verification_logs(human_reviewed);
CREATE INDEX IF NOT EXISTS idx_verification_logs_created ON verification_logs(created_at DESC);

-- Add RLS policies for verification_logs (admin only)
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all verification logs"
  ON verification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "System can insert verification logs"
  ON verification_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update verification logs"
  ON verification_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Function to update next_verification_at based on field-level cadence
CREATE OR REPLACE FUNCTION calculate_next_verification(resource_data JSONB)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_check TIMESTAMPTZ;
BEGIN
  -- Default to 30 days (most volatile fields like phone)
  -- This will be refined by the Verification Agent based on field-specific cadence:
  -- - phone: 30 days
  -- - website: 60 days
  -- - hours: 60 days
  -- - email: 90 days
  -- - address: 180 days
  -- - name: 365 days
  next_check := NOW() + INTERVAL '30 days';

  RETURN next_check;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update next_verification_at after successful verification
CREATE OR REPLACE FUNCTION update_next_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'verified' THEN
    NEW.next_verification_at := calculate_next_verification(row_to_json(NEW)::jsonb);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_verification
  BEFORE UPDATE OF verification_status ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_next_verification();

-- Comments
COMMENT ON COLUMN resources.verification_history IS 'Array of verification events with timestamps and results';
COMMENT ON COLUMN resources.last_verified_at IS 'Most recent verification timestamp';
COMMENT ON COLUMN resources.next_verification_at IS 'When resource should be re-verified (based on field-level cadence)';
COMMENT ON COLUMN resources.verification_status IS 'Current verification status: pending, verified, flagged, rejected';
COMMENT ON COLUMN resources.verification_confidence IS 'Overall confidence score 0-1 from last verification';
COMMENT ON COLUMN resources.human_review_required IS 'Whether resource needs human review';
COMMENT ON COLUMN resources.provenance IS 'Complete provenance data: who discovered, how, when, verification history';

COMMENT ON TABLE verification_logs IS 'Tracks all autonomous AI verification attempts with detailed results and performance metrics';
COMMENT ON COLUMN verification_logs.checks_performed IS 'JSONB object with all verification checks and their results';
COMMENT ON COLUMN verification_logs.conflicts_found IS 'Array of conflicts detected during adversarial verification';
COMMENT ON COLUMN verification_logs.changes_detected IS 'Array of changes detected from previous verification';
COMMENT ON COLUMN verification_logs.decision IS 'Final decision: auto_approve, flag_for_human, auto_reject';
COMMENT ON COLUMN verification_logs.estimated_cost_usd IS 'Estimated cost of verification (API calls, compute)';
