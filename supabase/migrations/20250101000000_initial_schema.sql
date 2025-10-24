-- Reentry Map - Initial Database Schema
-- Migration: 20250101000000_initial_schema.sql
-- Description: Core tables, indexes, and PostGIS setup for the Reentry Map application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Extended user profile table (integrates with auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin queries
CREATE INDEX idx_users_admin ON users(is_admin) WHERE is_admin = true;

-- Add comments
COMMENT ON TABLE users IS 'Extended user profile data linked to Supabase Auth';
COMMENT ON COLUMN users.is_admin IS 'Admin flag for access control';

-- =============================================================================
-- RESOURCES TABLE
-- =============================================================================
-- Primary table for all reentry resources
CREATE TABLE resources (
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

  -- Location (required for mapping)
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,

  -- Schedule (stored as JSONB for flexibility)
  -- Format: {"monday": {"open": "09:00", "close": "17:00"}, ...}
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

  -- Media
  photos JSONB[], -- Array of photo objects: [{"url": "...", "caption": "..."}]
  logo_url TEXT,

  -- AI Metadata
  ai_discovered BOOLEAN DEFAULT false,
  ai_enriched BOOLEAN DEFAULT false,
  ai_last_verified TIMESTAMPTZ,
  ai_verification_score DOUBLE PRECISION,
  data_completeness_score DOUBLE PRECISION,

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_date TIMESTAMPTZ,

  -- Community Stats (auto-updated by triggers)
  rating_average DOUBLE PRECISION DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'closed')),
  status_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for efficient location queries (within N miles)
CREATE INDEX idx_resources_location ON resources
USING GIST (ST_MakePoint(longitude, latitude)::geography);

-- Full-text search index on name and description
CREATE INDEX idx_resources_search ON resources
USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Category indexes for filtering
CREATE INDEX idx_resources_primary_category ON resources(primary_category);
CREATE INDEX idx_resources_categories ON resources USING GIN(categories);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);

-- Status index (only index active resources for performance)
CREATE INDEX idx_resources_status ON resources(status) WHERE status = 'active';

-- Rating index for sorting
CREATE INDEX idx_resources_rating ON resources(rating_average DESC) WHERE status = 'active';

-- Add comments
COMMENT ON TABLE resources IS 'Primary table for reentry resources and services';
COMMENT ON COLUMN resources.hours IS 'Operating hours in JSONB format: {"monday": {"open": "09:00", "close": "17:00"}}';
COMMENT ON COLUMN resources.primary_category IS 'Primary category for main filtering (employment, housing, food, etc.)';
COMMENT ON COLUMN resources.ai_verification_score IS 'Confidence score from AI verification (0-1)';
COMMENT ON COLUMN resources.data_completeness_score IS 'Percentage of fields populated (0-1)';

-- =============================================================================
-- USER_FAVORITES TABLE
-- =============================================================================
-- Users' saved/bookmarked resources
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_favorites_resource ON user_favorites(resource_id);

COMMENT ON TABLE user_favorites IS 'User-saved resources with optional personal notes';

-- =============================================================================
-- RESOURCE_RATINGS TABLE
-- =============================================================================
-- User ratings for resources (1-5 stars)
CREATE TABLE resource_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_ratings_resource ON resource_ratings(resource_id);
CREATE INDEX idx_ratings_user ON resource_ratings(user_id);

COMMENT ON TABLE resource_ratings IS 'User ratings (1-5 stars) for resources';

-- =============================================================================
-- RESOURCE_REVIEWS TABLE
-- =============================================================================
-- Detailed user reviews with text feedback
CREATE TABLE resource_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  visited_date DATE,
  was_helpful BOOLEAN,
  would_recommend BOOLEAN,
  pros TEXT,
  cons TEXT,
  tips TEXT,

  -- Verification
  verified_visit BOOLEAN DEFAULT false,

  -- Moderation
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  approved BOOLEAN DEFAULT true,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMPTZ,

  -- Community engagement (auto-updated by triggers)
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_reviews_resource ON resource_reviews(resource_id, created_at DESC);
CREATE INDEX idx_reviews_user ON resource_reviews(user_id);
CREATE INDEX idx_reviews_helpful ON resource_reviews(helpful_count DESC);

COMMENT ON TABLE resource_reviews IS 'Detailed user reviews with ratings and text feedback';
COMMENT ON COLUMN resource_reviews.approved IS 'Moderation status - only approved reviews are publicly visible';

-- =============================================================================
-- REVIEW_HELPFULNESS TABLE
-- =============================================================================
-- Users vote on review helpfulness
CREATE TABLE review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES resource_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL, -- true = helpful, false = not helpful
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

CREATE INDEX idx_helpfulness_review ON review_helpfulness(review_id);

COMMENT ON TABLE review_helpfulness IS 'User votes on review helpfulness';

-- =============================================================================
-- RESOURCE_SUGGESTIONS TABLE
-- =============================================================================
-- User-submitted resource suggestions for admin review
CREATE TABLE resource_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Suggested resource details
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  category TEXT,

  -- Context
  reason TEXT,
  personal_experience TEXT,

  -- Review workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- If approved, link to created resource
  created_resource_id UUID REFERENCES resources(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suggestions_status ON resource_suggestions(status);
CREATE INDEX idx_suggestions_user ON resource_suggestions(suggested_by);

COMMENT ON TABLE resource_suggestions IS 'User-submitted resource suggestions pending admin review';

-- =============================================================================
-- RESOURCE_UPDATES TABLE
-- =============================================================================
-- User-reported updates/corrections to existing resources
CREATE TABLE resource_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,

  update_type TEXT NOT NULL, -- e.g., 'hours_changed', 'closed', 'moved', 'phone_changed'
  old_value TEXT,
  new_value TEXT,
  description TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_updates_resource ON resource_updates(resource_id);
CREATE INDEX idx_updates_status ON resource_updates(status);

COMMENT ON TABLE resource_updates IS 'User-reported corrections and updates to resource data';

-- =============================================================================
-- AI_AGENT_LOGS TABLE
-- =============================================================================
-- Logging for AI agent operations
CREATE TABLE ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL, -- 'discovery', 'enrichment', 'verification', 'categorization'
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,

  action TEXT NOT NULL,
  input JSONB,
  output JSONB,

  success BOOLEAN,
  error_message TEXT,
  confidence_score DOUBLE PRECISION,

  cost DOUBLE PRECISION, -- API costs in USD
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_type ON ai_agent_logs(agent_type, created_at DESC);
CREATE INDEX idx_agent_logs_resource ON ai_agent_logs(resource_id);
CREATE INDEX idx_agent_logs_created ON ai_agent_logs(created_at DESC);

COMMENT ON TABLE ai_agent_logs IS 'Audit log for all AI agent operations with cost tracking';
COMMENT ON COLUMN ai_agent_logs.cost IS 'API cost in USD for this operation';
