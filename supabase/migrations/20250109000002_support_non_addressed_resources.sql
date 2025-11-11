-- Migration: Support for non-addressed resources and approval corrections
-- Created: 2025-01-09
-- Purpose:
--   1. Support resources without physical addresses (hotlines, online services, confidential locations)
--   2. Track what was corrected during approval process
--   3. Distinguish between temporary and permanent closures
--   4. Create queue for resources needing further attention

-- ============================================================================
-- PART 1: Update resources table to support non-addressed resources
-- ============================================================================

-- Make coordinates nullable (not all resources have physical locations)
ALTER TABLE resources
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- Add address_type to distinguish different kinds of resources
ALTER TABLE resources
  ADD COLUMN address_type TEXT DEFAULT 'physical' CHECK (address_type IN (
    'physical',      -- Standard physical location with full address
    'confidential',  -- Confidential location (shelters) - city/county only
    'regional',      -- Regional service (county-wide, state-wide)
    'online',        -- Online-only service (websites, apps, virtual meetings)
    'mobile'         -- Mobile service (food trucks, mobile clinics)
  ));

-- Add service_area for regional/mobile/online services
-- Format: {"type": "county", "values": ["Alameda County"]}
-- Format: {"type": "city", "values": ["Oakland", "Berkeley"]}
-- Format: {"type": "state", "values": ["CA"]}
-- Format: {"type": "nationwide", "values": []}
ALTER TABLE resources
  ADD COLUMN service_area JSONB;

-- Add closure_status for tracking temporary vs permanent closures
ALTER TABLE resources
  ADD COLUMN closure_status TEXT CHECK (closure_status IN (
    'temporary',  -- Temporarily closed (holiday, renovation, etc.)
    'permanent',  -- Permanently closed
    NULL          -- Not closed (default)
  ));

-- Add correction_notes to track what was fixed during approval
ALTER TABLE resources
  ADD COLUMN correction_notes TEXT;

-- Add index for service_area queries
CREATE INDEX idx_resources_service_area ON resources USING GIN (service_area);

-- Add index for address_type filtering
CREATE INDEX idx_resources_address_type ON resources (address_type);

-- Add index for closure_status
CREATE INDEX idx_resources_closure_status ON resources (closure_status) WHERE closure_status IS NOT NULL;

-- ============================================================================
-- PART 2: Update resource_suggestions for better rejection tracking
-- ============================================================================

-- Add status for resources needing further attention (not fully rejected)
-- Current statuses: 'pending', 'approved', 'rejected'
-- New status: 'needs_attention'
ALTER TABLE resource_suggestions
  DROP CONSTRAINT IF EXISTS resource_suggestions_status_check;

ALTER TABLE resource_suggestions
  ADD CONSTRAINT resource_suggestions_status_check CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'needs_attention'  -- Requires human review before final decision
  ));

-- Add structured rejection reason
ALTER TABLE resource_suggestions
  ADD COLUMN rejection_reason TEXT CHECK (rejection_reason IN (
    -- Permanent rejections (remove from queue)
    'duplicate',
    'wrong_service_type',
    'permanently_closed',
    'does_not_exist',
    'wrong_location',
    'spam',
    'insufficient_info',

    -- Needs attention (keep in review queue)
    'wrong_name',
    'incomplete_address',
    'temporarily_closed',
    'needs_verification',
    'confidential_address',
    'missing_details'
  ));

-- Add closure_status tracking for suggestions too
ALTER TABLE resource_suggestions
  ADD COLUMN closure_status TEXT CHECK (closure_status IN (
    'temporary',
    'permanent',
    NULL
  ));

-- Add correction_notes to track what needs fixing
ALTER TABLE resource_suggestions
  ADD COLUMN correction_notes TEXT;

-- ============================================================================
-- PART 3: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN resources.address_type IS 'Type of address/location: physical, confidential, regional, online, or mobile';
COMMENT ON COLUMN resources.service_area IS 'Geographic coverage for non-physical resources. JSONB format: {"type": "county", "values": ["Alameda County"]}';
COMMENT ON COLUMN resources.closure_status IS 'If closed: temporary (holiday, renovation) or permanent';
COMMENT ON COLUMN resources.correction_notes IS 'Notes about what was corrected during approval process';

COMMENT ON COLUMN resource_suggestions.rejection_reason IS 'Structured reason for rejection or needs_attention status';
COMMENT ON COLUMN resource_suggestions.closure_status IS 'If closed: temporary or permanent';
COMMENT ON COLUMN resource_suggestions.correction_notes IS 'Notes about what needs to be corrected';

-- ============================================================================
-- PART 4: Update validation constraints
-- ============================================================================

-- For physical addresses, require coordinates
-- For other types, coordinates are optional
CREATE OR REPLACE FUNCTION validate_resource_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Physical addresses must have coordinates
  IF NEW.address_type = 'physical' THEN
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
      RAISE EXCEPTION 'Physical resources must have latitude and longitude coordinates';
    END IF;
  END IF;

  -- Non-physical resources should have service_area
  IF NEW.address_type IN ('regional', 'online', 'mobile') THEN
    IF NEW.service_area IS NULL THEN
      RAISE EXCEPTION 'Regional, online, and mobile resources must have service_area defined';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_resource_location_trigger
  BEFORE INSERT OR UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION validate_resource_location();

-- ============================================================================
-- PART 5: Create view for "needs attention" queue
-- ============================================================================

CREATE OR REPLACE VIEW needs_attention_queue AS
SELECT
  rs.*,
  vl.confidence_score,
  vl.verification_notes,
  vl.data_quality_issues,
  vl.created_at as last_verification
FROM resource_suggestions rs
LEFT JOIN LATERAL (
  SELECT confidence_score, verification_notes, data_quality_issues, created_at
  FROM verification_logs
  WHERE suggestion_id = rs.id
  ORDER BY created_at DESC
  LIMIT 1
) vl ON true
WHERE rs.status = 'needs_attention'
ORDER BY rs.created_at DESC;

COMMENT ON VIEW needs_attention_queue IS 'Resources flagged as needing human attention before final approval/rejection decision';
