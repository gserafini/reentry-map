-- Reentry Map - Database Functions and Triggers
-- Migration: 20250101000002_functions_triggers.sql
-- Description: Automated functions for maintaining aggregate counts and timestamps

-- =============================================================================
-- TIMESTAMP UPDATE FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_reviews_updated_at
  BEFORE UPDATE ON resource_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RESOURCE RATING AGGREGATION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_resource_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate average rating and count for the resource
  UPDATE resources
  SET
    rating_average = (
      SELECT COALESCE(AVG(rating), 0)
      FROM resource_ratings
      WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM resource_ratings
      WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
    )
  WHERE id = COALESCE(NEW.resource_id, OLD.resource_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resource_rating_on_insert
  AFTER INSERT ON resource_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_rating();

CREATE TRIGGER update_resource_rating_on_update
  AFTER UPDATE ON resource_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_rating();

CREATE TRIGGER update_resource_rating_on_delete
  AFTER DELETE ON resource_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_rating();

-- =============================================================================
-- RESOURCE REVIEW COUNT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_resource_review_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resources
  SET review_count = (
    SELECT COUNT(*)
    FROM resource_reviews
    WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
      AND is_approved = true
  )
  WHERE id = COALESCE(NEW.resource_id, OLD.resource_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resource_review_count_on_insert
  AFTER INSERT ON resource_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_review_count();

CREATE TRIGGER update_resource_review_count_on_update
  AFTER UPDATE ON resource_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_review_count();

CREATE TRIGGER update_resource_review_count_on_delete
  AFTER DELETE ON resource_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_review_count();

-- =============================================================================
-- REVIEW HELPFULNESS COUNT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_review_helpfulness_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resource_reviews
  SET
    helpful_count = (
      SELECT COUNT(*)
      FROM review_helpfulness
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
        AND is_helpful = true
    ),
    not_helpful_count = (
      SELECT COUNT(*)
      FROM review_helpfulness
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
        AND is_helpful = false
    )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_helpfulness_count_on_insert
  AFTER INSERT ON review_helpfulness
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpfulness_count();

CREATE TRIGGER update_review_helpfulness_count_on_update
  AFTER UPDATE ON review_helpfulness
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpfulness_count();

CREATE TRIGGER update_review_helpfulness_count_on_delete
  AFTER DELETE ON review_helpfulness
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpfulness_count();

-- =============================================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone)
  VALUES (
    NEW.id,
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Calculate distance between two points (in miles)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  -- Haversine formula for distance in miles
  RETURN (
    3959 * acos(
      cos(radians(lat1)) *
      cos(radians(lat2)) *
      cos(radians(lon2) - radians(lon1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get resources within radius (miles)
CREATE OR REPLACE FUNCTION get_resources_near(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.address,
    calculate_distance(user_lat, user_lng, r.latitude, r.longitude) AS distance
  FROM resources r
  WHERE r.status = 'active'
    AND r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lng, r.latitude, r.longitude) <= radius_miles
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_resources_near IS 'Find resources within specified radius of coordinates';
