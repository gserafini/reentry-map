-- Verification Events - Real-time event streaming for verification agent
-- Allows Command Center to show live verification progress

CREATE TABLE IF NOT EXISTS verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to suggestion being verified
  suggestion_id UUID REFERENCES resource_suggestions(id) ON DELETE CASCADE,

  -- Event type and data
  event_type TEXT NOT NULL CHECK (event_type IN (
    'started',      -- Verification started
    'progress',     -- Progress update (e.g., "Phone validated")
    'cost',         -- Cost update from AI API call
    'completed',    -- Verification completed
    'failed'        -- Verification failed with error
  )),

  -- Event payload (JSONB for flexibility)
  event_data JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_verification_events_suggestion ON verification_events(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_verification_events_created_at ON verification_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_events_type ON verification_events(event_type);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE verification_events;

-- RLS: Admins can view all events
ALTER TABLE verification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view verification events"
  ON verification_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "System can insert verification events"
  ON verification_events FOR INSERT
  WITH CHECK (true);

-- Auto-cleanup: Delete events older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_old_verification_events()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_events
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Run cleanup daily (via pg_cron or manual trigger)
-- For now, we'll manually trigger it or clean up in the UI

-- Comments
COMMENT ON TABLE verification_events IS 'Real-time events from verification agent for Command Center';
COMMENT ON COLUMN verification_events.event_type IS 'Type of event: started, progress, cost, completed, failed';
COMMENT ON COLUMN verification_events.event_data IS 'Event payload with details (step, status, cost, etc.)';
