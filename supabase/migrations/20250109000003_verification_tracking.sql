-- Migration: Add verification tracking and quality control fields
-- Created: 2025-01-09
-- Purpose: Track verification sources, prevent shortcuts, ensure data quality

-- ============================================================================
-- PART 1: Add verification tracking fields to resources table
-- ============================================================================

-- Track where data was verified from (website URL or search query)
ALTER TABLE resources
  ADD COLUMN verification_source TEXT;

-- Track when resource was last verified
ALTER TABLE resources
  ADD COLUMN last_verified_at TIMESTAMPTZ DEFAULT NOW();

-- Track who verified (admin user ID or 'api_key' for Claude Code)
ALTER TABLE resources
  ADD COLUMN verified_by TEXT;

-- Add indexes for verification queries
CREATE INDEX idx_resources_last_verified ON resources (last_verified_at DESC);
CREATE INDEX idx_resources_verification_source ON resources (verification_source) WHERE verification_source IS NOT NULL;

-- ============================================================================
-- PART 2: Add validation constraints
-- ============================================================================

-- Email field already exists, but let's add validation pattern
ALTER TABLE resources
  DROP CONSTRAINT IF EXISTS resources_email_check;

ALTER TABLE resources
  ADD CONSTRAINT resources_email_check
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure verification_source is documented for admin-approved resources
-- (Don't enforce on existing data, only new approvals)
COMMENT ON COLUMN resources.verification_source IS 'Source URL or search query used to verify this resource. Required for admin_approved resources.';
COMMENT ON COLUMN resources.last_verified_at IS 'Timestamp of last verification/update. Auto-updated on insert.';
COMMENT ON COLUMN resources.verified_by IS 'User ID or "api_key" indicating who verified this resource.';

-- ============================================================================
-- PART 3: Update existing resources to track verification
-- ============================================================================

-- Set last_verified_at for existing resources (use created_at as fallback)
UPDATE resources
SET last_verified_at = created_at
WHERE last_verified_at IS NULL;

-- ============================================================================
-- PART 4: Create view for resources needing re-verification
-- ============================================================================

CREATE OR REPLACE VIEW resources_needing_verification AS
SELECT
  id,
  name,
  address,
  city,
  state,
  email,
  website,
  last_verified_at,
  verification_source,
  created_at,
  -- Calculate age in days
  EXTRACT(EPOCH FROM (NOW() - last_verified_at)) / 86400 AS days_since_verification,
  -- Priority score (higher = more urgent)
  CASE
    WHEN email IS NULL THEN 100 -- Missing email
    WHEN verification_source IS NULL THEN 90 -- No verification source documented
    WHEN last_verified_at < NOW() - INTERVAL '6 months' THEN 80 -- Old verification
    WHEN phone IS NULL AND email IS NULL THEN 70 -- No contact info
    ELSE 50 -- Standard re-verification
  END AS verification_priority
FROM resources
WHERE status = 'active'
ORDER BY verification_priority DESC, last_verified_at ASC;

COMMENT ON VIEW resources_needing_verification IS 'Resources that need verification/re-verification, prioritized by missing data and verification age';

-- ============================================================================
-- PART 5: Create trigger to auto-update last_verified_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_last_verified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_verified_at when important fields change
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

CREATE TRIGGER update_resource_verification_timestamp
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_last_verified_timestamp();

-- ============================================================================
-- PART 6: Add verification quality metrics view
-- ============================================================================

CREATE OR REPLACE VIEW verification_quality_metrics AS
SELECT
  COUNT(*) AS total_resources,
  COUNT(email) AS resources_with_email,
  COUNT(verification_source) AS resources_with_source,
  COUNT(CASE WHEN last_verified_at > NOW() - INTERVAL '3 months' THEN 1 END) AS recently_verified,
  ROUND(100.0 * COUNT(email) / NULLIF(COUNT(*), 0), 1) AS email_coverage_percent,
  ROUND(100.0 * COUNT(verification_source) / NULLIF(COUNT(*), 0), 1) AS source_documented_percent,
  ROUND(100.0 * COUNT(CASE WHEN last_verified_at > NOW() - INTERVAL '3 months' THEN 1 END) / NULLIF(COUNT(*), 0), 1) AS recent_verification_percent
FROM resources
WHERE status = 'active';

COMMENT ON VIEW verification_quality_metrics IS 'Overall data quality metrics for verification tracking';
