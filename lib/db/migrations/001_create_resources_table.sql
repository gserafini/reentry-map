-- Migration: 001_create_resources_table.sql
-- Creates the resources table for self-hosted PostgreSQL
-- Based on Supabase schema with 76 columns

-- Ensure PostGIS extension is enabled (should already be done)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Resources table (main resource directory)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  name TEXT NOT NULL,
  description TEXT,
  services_offered TEXT[],

  -- Contact Information
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  phone_last_verified TIMESTAMPTZ,
  email TEXT,
  website TEXT,

  -- Location
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  county TEXT,
  county_fips TEXT,
  neighborhood TEXT,
  formatted_address TEXT,
  google_place_id TEXT,
  location_type TEXT,
  address_type TEXT DEFAULT 'physical',
  service_area JSONB,

  -- Schedule & Hours
  hours JSONB,
  timezone TEXT DEFAULT 'America/Los_Angeles',

  -- Categorization
  primary_category TEXT NOT NULL,
  categories TEXT[],
  tags TEXT[],

  -- Eligibility & Requirements
  eligibility_requirements TEXT,
  accepts_records BOOLEAN DEFAULT true,
  appointment_required BOOLEAN DEFAULT false,
  required_documents TEXT[],
  fees TEXT,

  -- Accessibility & Languages
  languages TEXT[],
  accessibility_features TEXT[],

  -- Media
  photos JSONB,
  logo_url TEXT,
  screenshot_url TEXT,
  screenshot_captured_at TIMESTAMPTZ,

  -- AI Metadata
  ai_discovered BOOLEAN DEFAULT false,
  ai_enriched BOOLEAN DEFAULT false,
  ai_last_verified TIMESTAMPTZ,
  ai_verification_score DOUBLE PRECISION,
  data_completeness_score DOUBLE PRECISION,

  -- Verification (Autonomous AI System)
  verification_status TEXT DEFAULT 'pending',
  verification_confidence NUMERIC,
  verification_history JSONB DEFAULT '[]',
  last_verified_at TIMESTAMPTZ,
  next_verification_at TIMESTAMPTZ,
  verification_source TEXT,
  human_review_required BOOLEAN DEFAULT false,
  provenance JSONB,

  -- Manual Verification (Legacy)
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_date TIMESTAMPTZ,

  -- Community Stats (Auto-Updated by Triggers)
  rating_average DOUBLE PRECISION DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Status & Moderation
  status TEXT DEFAULT 'active',
  status_reason TEXT,
  closure_status TEXT,
  correction_notes TEXT,

  -- Parent-Child Relationships
  parent_resource_id UUID,
  org_name TEXT,
  location_name TEXT,
  is_parent BOOLEAN DEFAULT false,
  change_log JSONB DEFAULT '[]',

  -- Data Provenance & External IDs
  source TEXT,
  is_unique BOOLEAN DEFAULT false,
  also_in_211 BOOLEAN DEFAULT false,
  also_in_govt_db BOOLEAN DEFAULT false,
  external_211_id TEXT,
  external_govt_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- SEO
  slug TEXT
);

-- Add self-reference for parent_resource_id
ALTER TABLE resources
  ADD CONSTRAINT fk_resources_parent
  FOREIGN KEY (parent_resource_id)
  REFERENCES resources(id)
  ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resources_primary_category ON resources(primary_category);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_verification_status ON resources(verification_status);
CREATE INDEX IF NOT EXISTS idx_resources_slug ON resources(slug);
CREATE INDEX IF NOT EXISTS idx_resources_city_state ON resources(city, state);
CREATE INDEX IF NOT EXISTS idx_resources_categories ON resources USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_resources_parent ON resources(parent_resource_id);

-- PostGIS spatial index for location queries
CREATE INDEX IF NOT EXISTS idx_resources_location ON resources
USING GIST (ST_MakePoint(longitude, latitude)::geography)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_resources_search ON resources
USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Comments
COMMENT ON TABLE resources IS 'Primary resource directory - 76 columns with full location, verification, and categorization data';
COMMENT ON COLUMN resources.verification_status IS 'Autonomous verification status: pending, verified, needs_review, failed';
COMMENT ON COLUMN resources.photos IS 'JSONB array of photo objects: [{"url": "...", "caption": "..."}]';
