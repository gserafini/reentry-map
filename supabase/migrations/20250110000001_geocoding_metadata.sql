-- Add geocoding metadata fields to resources table
-- Captures all data from Google Maps Geocoding API for deduplication and quality tracking

-- Google's unique identifier for this location (critical for deduplication)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Geocoding accuracy indicator
-- Values: ROOFTOP (best), RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE (worst)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS location_type TEXT;

-- Neighborhood name (if available)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Google's formatted address (canonical reference)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_resources_place_id ON resources(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_location_type ON resources(location_type);

-- Comments
COMMENT ON COLUMN resources.google_place_id IS 'Google Maps Place ID - stable unique identifier for deduplication';
COMMENT ON COLUMN resources.location_type IS 'Geocoding accuracy: ROOFTOP (exact), RANGE_INTERPOLATED (street), GEOMETRIC_CENTER (area), APPROXIMATE (poor)';
COMMENT ON COLUMN resources.neighborhood IS 'Neighborhood name from Google geocoding (e.g., "Fruitvale", "Downtown Oakland")';
COMMENT ON COLUMN resources.formatted_address IS 'Canonical formatted address from Google Maps';
