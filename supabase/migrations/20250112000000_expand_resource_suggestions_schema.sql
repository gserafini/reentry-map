-- Migration: Expand resource_suggestions schema for full resource data
-- Created: 2025-01-12
-- Purpose: Support complete resource submission from AI agents with all fields needed
--          to create a full resource entry upon approval
--
-- Background:
-- The suggest-batch API endpoint was accepting full resource data (city, state, email, etc.)
-- but resource_suggestions table only had basic fields (name, address, phone, website).
-- This migration adds all necessary fields so suggestions can capture complete resource data.

-- ============================================================================
-- PART 1: Add location fields (city, state, zip, coordinates)
-- ============================================================================

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS county TEXT;

-- ============================================================================
-- PART 2: Add contact fields (email)
-- ============================================================================

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================================================
-- PART 3: Add categorization fields (primary_category, categories, tags)
-- ============================================================================

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS primary_category TEXT,
  ADD COLUMN IF NOT EXISTS categories TEXT[],
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- ============================================================================
-- PART 4: Add service details (hours, services, eligibility, etc.)
-- ============================================================================

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS hours JSONB,
  ADD COLUMN IF NOT EXISTS services_offered TEXT[],
  ADD COLUMN IF NOT EXISTS eligibility_requirements TEXT,
  ADD COLUMN IF NOT EXISTS required_documents TEXT[],
  ADD COLUMN IF NOT EXISTS fees TEXT,
  ADD COLUMN IF NOT EXISTS languages TEXT[],
  ADD COLUMN IF NOT EXISTS accessibility_features TEXT[];

-- ============================================================================
-- PART 5: Add provenance tracking (source, source_url)
-- ============================================================================

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- ============================================================================
-- PART 6: Add organization metadata
-- ============================================================================

ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS org_name TEXT,
  ADD COLUMN IF NOT EXISTS location_name TEXT;

-- ============================================================================
-- PART 7: Add indexes for common queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_resource_suggestions_city_state
  ON resource_suggestions(city, state);

CREATE INDEX IF NOT EXISTS idx_resource_suggestions_primary_category
  ON resource_suggestions(primary_category);

CREATE INDEX IF NOT EXISTS idx_resource_suggestions_coordinates
  ON resource_suggestions(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- PART 8: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN resource_suggestions.city IS 'City where resource is located';
COMMENT ON COLUMN resource_suggestions.state IS 'State code (e.g., CA)';
COMMENT ON COLUMN resource_suggestions.zip IS 'ZIP code';
COMMENT ON COLUMN resource_suggestions.latitude IS 'Latitude coordinate for mapping';
COMMENT ON COLUMN resource_suggestions.longitude IS 'Longitude coordinate for mapping';
COMMENT ON COLUMN resource_suggestions.county IS 'County name';
COMMENT ON COLUMN resource_suggestions.email IS 'Contact email address';
COMMENT ON COLUMN resource_suggestions.primary_category IS 'Primary service category';
COMMENT ON COLUMN resource_suggestions.categories IS 'Array of all applicable categories';
COMMENT ON COLUMN resource_suggestions.tags IS 'Array of searchable tags';
COMMENT ON COLUMN resource_suggestions.hours IS 'Operating hours as JSONB (e.g., {"monday": "9am-5pm"})';
COMMENT ON COLUMN resource_suggestions.services_offered IS 'Array of specific services provided';
COMMENT ON COLUMN resource_suggestions.eligibility_requirements IS 'Who can access this resource';
COMMENT ON COLUMN resource_suggestions.required_documents IS 'Array of documents needed to access service';
COMMENT ON COLUMN resource_suggestions.fees IS 'Fee structure or "Free"';
COMMENT ON COLUMN resource_suggestions.languages IS 'Array of languages supported';
COMMENT ON COLUMN resource_suggestions.accessibility_features IS 'Array of accessibility features';
COMMENT ON COLUMN resource_suggestions.source IS 'How this resource was discovered (e.g., google_search, 211, manual)';
COMMENT ON COLUMN resource_suggestions.source_url IS 'URL where resource information was found';
COMMENT ON COLUMN resource_suggestions.org_name IS 'Parent organization name';
COMMENT ON COLUMN resource_suggestions.location_name IS 'Specific location name if different from org';

-- ============================================================================
-- PART 9: Update verification tracking to handle new fields
-- ============================================================================

-- The verification_logs table references resource_suggestions
-- Ensure verification can check all these new fields
COMMENT ON TABLE resource_suggestions IS 'User and AI-submitted resource suggestions with complete data for approval. Upon approval, all fields are copied to resources table.';
