-- Reentry Map - Row Level Security Policies
-- Migration: 20250101000001_rls_policies.sql
-- Description: RLS policies for secure data access

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpfulness ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USERS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- RESOURCES POLICIES (Public read, admin write)
-- =============================================================================
CREATE POLICY "Resources are viewable by everyone"
  ON resources FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can insert resources"
  ON resources FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update resources"
  ON resources FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete resources"
  ON resources FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- USER FAVORITES POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
  ON user_favorites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- RESOURCE RATINGS POLICIES
-- =============================================================================
CREATE POLICY "Ratings are viewable by everyone"
  ON resource_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ratings"
  ON resource_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON resource_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON resource_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- RESOURCE REVIEWS POLICIES
-- =============================================================================
CREATE POLICY "Approved reviews are viewable by everyone"
  ON resource_reviews FOR SELECT
  USING (approved = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own reviews"
  ON resource_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON resource_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON resource_reviews FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can approve/reject reviews"
  ON resource_reviews FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- REVIEW HELPFULNESS POLICIES
-- =============================================================================
CREATE POLICY "Helpfulness votes are viewable by everyone"
  ON review_helpfulness FOR SELECT
  USING (true);

CREATE POLICY "Users can insert helpfulness votes"
  ON review_helpfulness FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own helpfulness votes"
  ON review_helpfulness FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own helpfulness votes"
  ON review_helpfulness FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- RESOURCE SUGGESTIONS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own suggestions"
  ON resource_suggestions FOR SELECT
  USING (auth.uid() = suggested_by);

CREATE POLICY "Admins can view all suggestions"
  ON resource_suggestions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can insert suggestions"
  ON resource_suggestions FOR INSERT
  WITH CHECK (auth.uid() = suggested_by);

CREATE POLICY "Admins can update suggestions"
  ON resource_suggestions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- RESOURCE UPDATES POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own update reports"
  ON resource_updates FOR SELECT
  USING (auth.uid() = reported_by);

CREATE POLICY "Admins can view all update reports"
  ON resource_updates FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can insert update reports"
  ON resource_updates FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can update/resolve reports"
  ON resource_updates FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- AI AGENT LOGS POLICIES (Admin only)
-- =============================================================================
CREATE POLICY "Admins can view AI logs"
  ON ai_agent_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can insert AI logs"
  ON ai_agent_logs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
