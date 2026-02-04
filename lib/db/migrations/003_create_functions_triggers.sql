-- Migration: 003_create_functions_triggers.sql
-- Creates functions and triggers for self-hosted PostgreSQL
-- Based on Supabase functions migration

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

-- Apply to tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resource_reviews_updated_at ON resource_reviews;
CREATE TRIGGER update_resource_reviews_updated_at
  BEFORE UPDATE ON resource_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resource_ratings_updated_at ON resource_ratings;
CREATE TRIGGER update_resource_ratings_updated_at
  BEFORE UPDATE ON resource_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RESOURCE RATING AGGREGATION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_resource_rating()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS update_resource_rating_on_insert ON resource_ratings;
CREATE TRIGGER update_resource_rating_on_insert
  AFTER INSERT ON resource_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_rating();

DROP TRIGGER IF EXISTS update_resource_rating_on_update ON resource_ratings;
CREATE TRIGGER update_resource_rating_on_update
  AFTER UPDATE ON resource_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_rating();

DROP TRIGGER IF EXISTS update_resource_rating_on_delete ON resource_ratings;
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
      AND status = 'approved'
  )
  WHERE id = COALESCE(NEW.resource_id, OLD.resource_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_resource_review_count_on_insert ON resource_reviews;
CREATE TRIGGER update_resource_review_count_on_insert
  AFTER INSERT ON resource_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_review_count();

DROP TRIGGER IF EXISTS update_resource_review_count_on_update ON resource_reviews;
CREATE TRIGGER update_resource_review_count_on_update
  AFTER UPDATE ON resource_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_review_count();

DROP TRIGGER IF EXISTS update_resource_review_count_on_delete ON resource_reviews;
CREATE TRIGGER update_resource_review_count_on_delete
  AFTER DELETE ON resource_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_review_count();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Calculate distance between two points (in miles) using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
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

COMMENT ON FUNCTION calculate_distance IS 'Calculate distance between two coordinates in miles using Haversine formula';
COMMENT ON FUNCTION get_resources_near IS 'Find resources within specified radius of coordinates';
