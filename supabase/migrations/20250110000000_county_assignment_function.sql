-- County Assignment Function
-- Fast point-in-polygon lookup for automatic county assignment

-- Function: find_county_for_point
-- Determines which county contains a given lat/lng point using PostGIS
CREATE OR REPLACE FUNCTION find_county_for_point(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS TABLE (
  fips_code TEXT,
  county_name TEXT,
  state_code TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use ST_Contains for accurate point-in-polygon testing
  -- GeoJSON uses [lng, lat] order, so ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  RETURN QUERY
  SELECT
    cd.fips_code,
    cd.county_name,
    cd.state_code
  FROM county_data cd
  WHERE ST_Contains(
    cd.geometry::geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_county_for_point(DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION find_county_for_point(DOUBLE PRECISION, DOUBLE PRECISION) TO anon;

-- Comment
COMMENT ON FUNCTION find_county_for_point(DOUBLE PRECISION, DOUBLE PRECISION) IS
'Determines which county contains a given lat/lng point using PostGIS ST_Contains. Used for automatic county assignment during resource creation/update.';
