-- AI System Control Switches
-- Adds on/off switches for all AI systems with master control

-- Add AI system control columns to app_settings table
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS ai_master_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_verification_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_discovery_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_enrichment_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_realtime_monitoring_enabled BOOLEAN DEFAULT TRUE;

-- Comments
COMMENT ON COLUMN app_settings.ai_master_enabled IS 'Master switch for all AI operations. When OFF, disables all AI agents and automated systems.';
COMMENT ON COLUMN app_settings.ai_verification_enabled IS 'Enable autonomous verification agent to auto-verify resource submissions.';
COMMENT ON COLUMN app_settings.ai_discovery_enabled IS 'Enable discovery agent to find new resources from 211, Google, government sites.';
COMMENT ON COLUMN app_settings.ai_enrichment_enabled IS 'Enable enrichment agent to enhance resource data with missing fields.';
COMMENT ON COLUMN app_settings.ai_realtime_monitoring_enabled IS 'Enable real-time event streaming in Command Center for live verification monitoring.';

-- Initialize default values for existing row (if exists)
-- This ensures backward compatibility
UPDATE app_settings
SET
  ai_master_enabled = FALSE,
  ai_verification_enabled = FALSE,
  ai_discovery_enabled = FALSE,
  ai_enrichment_enabled = FALSE,
  ai_realtime_monitoring_enabled = TRUE
WHERE ai_master_enabled IS NULL;
