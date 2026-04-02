-- Fix verification_logs schema to match Drizzle ORM expectations
-- Missing columns from Supabase migration gap

ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS suggestion_id UUID REFERENCES resource_suggestions(id) ON DELETE SET NULL;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS agent_version TEXT;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS overall_score DOUBLE PRECISION;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS checks_performed JSONB DEFAULT '{}';
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS conflicts_found JSONB DEFAULT '[]';
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS changes_detected JSONB DEFAULT '[]';
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS decision_reason TEXT;

-- resource_id must be nullable (suggestions don't have a resource_id yet during verification)
ALTER TABLE verification_logs ALTER COLUMN resource_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verification_logs_suggestion ON verification_logs(suggestion_id);
