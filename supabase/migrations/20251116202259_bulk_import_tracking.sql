-- Bulk Import Tracking Infrastructure
-- Created: 2025-11-16
-- Purpose: Track large-scale data imports from government sources (CareerOneStop, SAMHSA, HUD)

-- =============================================================================
-- 1. Import Jobs Table
-- =============================================================================
-- Tracks bulk import jobs across sessions with progress monitoring and checkpointing

CREATE TABLE IF NOT EXISTS data_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source information
  source_name TEXT NOT NULL, -- 'careeronestop', 'samhsa', 'hud_exchange'
  source_url TEXT, -- URL where data was fetched from
  source_description TEXT, -- Human-readable description

  -- Job status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),

  -- Progress tracking
  total_records INTEGER, -- Total records to process
  processed_records INTEGER DEFAULT 0, -- Records processed so far
  successful_records INTEGER DEFAULT 0, -- Auto-approved or created
  failed_records INTEGER DEFAULT 0, -- Processing errors
  flagged_records INTEGER DEFAULT 0, -- Flagged for manual review
  rejected_records INTEGER DEFAULT 0, -- Auto-rejected
  skipped_records INTEGER DEFAULT 0, -- Skipped as duplicates

  -- Checkpointing for resume capability
  checkpoint_data JSONB, -- Resume state if interrupted
  -- Example: { "last_processed_index": 1234, "last_source_id": "ABC123", "batch_queue": [...] }

  -- Error tracking
  error_log JSONB[], -- Array of error objects
  -- Example: [{ "record_id": "123", "error": "Invalid address", "timestamp": "2024-..." }]

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ, -- ETA based on processing rate

  -- Ownership
  created_by UUID REFERENCES auth.users(id),

  -- Configuration and filters
  metadata JSONB,
  -- Example: {
  --   "filters": { "state": "CA", "category": "employment" },
  --   "verification_level": "L1",
  --   "batch_size": 50,
  --   "nationwide": true
  -- }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_import_jobs_status ON data_import_jobs(status, created_at DESC);
CREATE INDEX idx_import_jobs_source ON data_import_jobs(source_name, created_at DESC);
CREATE INDEX idx_import_jobs_created_by ON data_import_jobs(created_by, created_at DESC);

-- =============================================================================
-- 2. Import Records Table
-- =============================================================================
-- Tracks individual record processing within import jobs

CREATE TABLE IF NOT EXISTS data_import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job reference
  job_id UUID NOT NULL REFERENCES data_import_jobs(id) ON DELETE CASCADE,

  -- Source tracking
  source_id TEXT NOT NULL, -- External ID from source API/dataset
  source_url TEXT, -- Link back to original record in source system

  -- Data storage
  raw_data JSONB NOT NULL, -- Original API/CSV response
  normalized_data JSONB, -- After field mapping and normalization

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'geocoding', 'verifying', 'approved', 'flagged', 'rejected', 'error', 'skipped')),

  -- Results
  resource_id UUID REFERENCES resources(id), -- If created or matched
  suggestion_id UUID REFERENCES resource_suggestions(id), -- If flagged for review

  -- Error handling
  error_message TEXT,
  error_details JSONB, -- Detailed error information
  retry_count INTEGER DEFAULT 0,

  -- Verification results
  verification_score NUMERIC(3,2), -- 0.00 to 1.00
  verification_level TEXT CHECK (verification_level IN ('L1', 'L2', 'L3', 'none')),
  verification_decision TEXT CHECK (verification_decision IN ('approve', 'flag', 'reject')),
  verification_reason TEXT,

  -- Performance tracking
  processing_time_ms INTEGER, -- Total processing time
  geocoding_time_ms INTEGER, -- Time spent geocoding
  verification_time_ms INTEGER, -- Time spent in verification

  -- Geocoding results (for records that required geocoding)
  geocoding_attempted BOOLEAN DEFAULT FALSE,
  geocoding_success BOOLEAN,
  original_address TEXT, -- Address before geocoding
  geocoded_address TEXT, -- Formatted address from geocoding service
  geocoding_confidence TEXT, -- 'high', 'medium', 'low'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_import_records_job ON data_import_records(job_id, status);
CREATE INDEX idx_import_records_source ON data_import_records(job_id, source_id);
CREATE INDEX idx_import_records_status ON data_import_records(status, created_at DESC);
CREATE INDEX idx_import_records_resource ON data_import_records(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_import_records_suggestion ON data_import_records(suggestion_id) WHERE suggestion_id IS NOT NULL;

-- =============================================================================
-- 3. Row Level Security Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE data_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_records ENABLE ROW LEVEL SECURITY;

-- Admins can manage all import jobs
CREATE POLICY "Admins can view all import jobs"
  ON data_import_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create import jobs"
  ON data_import_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update import jobs"
  ON data_import_jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete import jobs"
  ON data_import_jobs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Admins can manage all import records
CREATE POLICY "Admins can view all import records"
  ON data_import_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage import records"
  ON data_import_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- =============================================================================
-- 4. Helper Functions
-- =============================================================================

-- Function to update job progress
CREATE OR REPLACE FUNCTION update_import_job_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update parent job stats when record status changes
  UPDATE data_import_jobs
  SET
    processed_records = (
      SELECT COUNT(*)
      FROM data_import_records
      WHERE job_id = NEW.job_id
      AND status NOT IN ('pending')
    ),
    successful_records = (
      SELECT COUNT(*)
      FROM data_import_records
      WHERE job_id = NEW.job_id
      AND status IN ('approved')
    ),
    failed_records = (
      SELECT COUNT(*)
      FROM data_import_records
      WHERE job_id = NEW.job_id
      AND status IN ('error')
    ),
    flagged_records = (
      SELECT COUNT(*)
      FROM data_import_records
      WHERE job_id = NEW.job_id
      AND status IN ('flagged')
    ),
    rejected_records = (
      SELECT COUNT(*)
      FROM data_import_records
      WHERE job_id = NEW.job_id
      AND status IN ('rejected')
    ),
    skipped_records = (
      SELECT COUNT(*)
      FROM data_import_records
      WHERE job_id = NEW.job_id
      AND status IN ('skipped')
    ),
    updated_at = NOW()
  WHERE id = NEW.job_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update job progress
CREATE TRIGGER trigger_update_import_job_progress
  AFTER INSERT OR UPDATE OF status ON data_import_records
  FOR EACH ROW
  EXECUTE FUNCTION update_import_job_progress();

-- Function to calculate ETA
CREATE OR REPLACE FUNCTION calculate_import_job_eta(job_id_param UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_job data_import_jobs%ROWTYPE;
  v_elapsed_seconds NUMERIC;
  v_records_per_second NUMERIC;
  v_remaining_records INTEGER;
  v_estimated_seconds NUMERIC;
BEGIN
  -- Get job details
  SELECT * INTO v_job FROM data_import_jobs WHERE id = job_id_param;

  -- If not started or completed, return null
  IF v_job.started_at IS NULL OR v_job.status IN ('completed', 'failed', 'cancelled') THEN
    RETURN NULL;
  END IF;

  -- Calculate elapsed time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_job.started_at));

  -- Avoid division by zero
  IF v_elapsed_seconds = 0 OR v_job.processed_records = 0 THEN
    RETURN NULL;
  END IF;

  -- Calculate processing rate
  v_records_per_second := v_job.processed_records::NUMERIC / v_elapsed_seconds;

  -- Calculate remaining records
  v_remaining_records := v_job.total_records - v_job.processed_records;

  -- Calculate estimated seconds remaining
  v_estimated_seconds := v_remaining_records / v_records_per_second;

  -- Return ETA
  RETURN NOW() + (v_estimated_seconds || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. Helpful Views
-- =============================================================================

-- View for job summary stats
CREATE OR REPLACE VIEW import_job_summary AS
SELECT
  j.id,
  j.source_name,
  j.status,
  j.total_records,
  j.processed_records,
  j.successful_records,
  j.failed_records,
  j.flagged_records,
  j.rejected_records,
  j.skipped_records,
  -- Calculate percentages
  CASE
    WHEN j.total_records > 0 THEN
      ROUND((j.processed_records::NUMERIC / j.total_records::NUMERIC) * 100, 1)
    ELSE 0
  END as progress_percentage,
  CASE
    WHEN j.processed_records > 0 THEN
      ROUND((j.successful_records::NUMERIC / j.processed_records::NUMERIC) * 100, 1)
    ELSE 0
  END as success_rate,
  -- Timing
  j.started_at,
  j.completed_at,
  calculate_import_job_eta(j.id) as estimated_completion_at,
  CASE
    WHEN j.started_at IS NOT NULL AND j.status = 'running' THEN
      NOW() - j.started_at
    WHEN j.started_at IS NOT NULL AND j.completed_at IS NOT NULL THEN
      j.completed_at - j.started_at
    ELSE NULL
  END as elapsed_time,
  -- Metadata
  j.created_by,
  j.created_at,
  j.metadata
FROM data_import_jobs j;

-- Comment on tables
COMMENT ON TABLE data_import_jobs IS 'Tracks bulk import jobs from government data sources';
COMMENT ON TABLE data_import_records IS 'Tracks individual record processing within import jobs';
COMMENT ON COLUMN data_import_jobs.checkpoint_data IS 'State for resuming interrupted imports';
COMMENT ON COLUMN data_import_records.raw_data IS 'Original unmodified data from source';
COMMENT ON COLUMN data_import_records.normalized_data IS 'Data after field mapping and normalization';
