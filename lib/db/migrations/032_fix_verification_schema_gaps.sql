-- Fix schema gaps discovered when enabling the verification pipeline
-- These columns were referenced in code but missing from earlier migrations

-- resource_suggestions: add address_type and service_area for non-physical resources
ALTER TABLE resource_suggestions ADD COLUMN IF NOT EXISTS address_type TEXT DEFAULT 'physical';
ALTER TABLE resource_suggestions ADD COLUMN IF NOT EXISTS service_area TEXT;

-- verification_logs: add columns referenced by verification-agent.ts logVerification()
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS api_calls_made INTEGER DEFAULT 0;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10,6) DEFAULT 0;

-- verification_logs.status was NOT NULL but logVerification() doesn't set it
-- (decision column serves the same purpose)
ALTER TABLE verification_logs ALTER COLUMN status DROP NOT NULL;
