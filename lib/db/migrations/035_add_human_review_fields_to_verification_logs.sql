-- Add missing human review audit columns to verification_logs
-- These columns already exist in the Drizzle schema and route logic, but are
-- absent in the live database on dc3-1.

ALTER TABLE verification_logs
  ADD COLUMN IF NOT EXISTS human_reviewed BOOLEAN DEFAULT false;

ALTER TABLE verification_logs
  ADD COLUMN IF NOT EXISTS human_reviewer_id UUID REFERENCES users(id);

ALTER TABLE verification_logs
  ADD COLUMN IF NOT EXISTS human_decision TEXT;

ALTER TABLE verification_logs
  ADD COLUMN IF NOT EXISTS human_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_verification_logs_human_review
  ON verification_logs(human_reviewed);
