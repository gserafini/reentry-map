-- Migration: 002_create_supporting_tables.sql
-- Creates supporting tables for user interactions and logging

-- =============================================================================
-- USER_FAVORITES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_resource ON user_favorites(resource_id);

COMMENT ON TABLE user_favorites IS 'User-saved resources with optional personal notes';

-- =============================================================================
-- RESOURCE_RATINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS resource_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_ratings_resource ON resource_ratings(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_ratings_user ON resource_ratings(user_id);

COMMENT ON TABLE resource_ratings IS 'User ratings (1-5 stars) for resources';

-- =============================================================================
-- RESOURCE_REVIEWS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS resource_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  pros TEXT[],
  cons TEXT[],
  tips TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_reviews_resource ON resource_reviews(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_reviews_user ON resource_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_reviews_status ON resource_reviews(status);

COMMENT ON TABLE resource_reviews IS 'Detailed user reviews with ratings and text feedback';

-- =============================================================================
-- RESOURCE_SUGGESTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS resource_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Suggested resource details
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  category TEXT,
  city TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Context
  reason TEXT,
  personal_experience TEXT,
  source_type TEXT,
  source_url TEXT,
  source_metadata JSONB,

  -- Review workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate', 'processing')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  priority INTEGER DEFAULT 0,

  -- AI processing
  ai_processed BOOLEAN DEFAULT false,
  ai_confidence DOUBLE PRECISION,
  ai_notes TEXT,

  -- If approved, link to created resource
  created_resource_id UUID REFERENCES resources(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_status ON resource_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON resource_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_suggestions_priority ON resource_suggestions(priority DESC);

COMMENT ON TABLE resource_suggestions IS 'User and AI-submitted resource suggestions pending admin review';

-- =============================================================================
-- VERIFICATION_LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence DOUBLE PRECISION,
  details JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_resource ON verification_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_type ON verification_logs(verification_type);
CREATE INDEX IF NOT EXISTS idx_verification_logs_created ON verification_logs(created_at DESC);

COMMENT ON TABLE verification_logs IS 'Log of all verification attempts for resources';

-- =============================================================================
-- AI_AGENT_LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  input JSONB,
  output JSONB,
  success BOOLEAN,
  error_message TEXT,
  confidence_score DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_type ON ai_agent_logs(agent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_resource ON ai_agent_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON ai_agent_logs(created_at DESC);

COMMENT ON TABLE ai_agent_logs IS 'Audit log for all AI agent operations with cost tracking';

-- =============================================================================
-- RESOURCE_UPDATES TABLE (user-reported corrections)
-- =============================================================================
CREATE TABLE IF NOT EXISTS resource_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  update_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_updates_resource ON resource_updates(resource_id);
CREATE INDEX IF NOT EXISTS idx_updates_status ON resource_updates(status);

COMMENT ON TABLE resource_updates IS 'User-reported corrections and updates to resource data';
