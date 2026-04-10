-- Support non-physical resource suggestions in the public and admin ingest flows.

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS address_type TEXT DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS service_area JSONB;

CREATE INDEX IF NOT EXISTS idx_resource_suggestions_address_type
  ON resource_suggestions(address_type);
