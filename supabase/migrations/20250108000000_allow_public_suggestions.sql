-- Allow public resource suggestions from AI agents and community members
-- This enables the /api/resources/suggest-batch endpoint to work without authentication

CREATE POLICY "Allow public resource suggestions"
  ON resource_suggestions FOR INSERT
  WITH CHECK (true);

COMMENT ON POLICY "Allow public resource suggestions" ON resource_suggestions IS
  'Allows anyone (including AI agents) to submit resource suggestions. Suggestions require admin approval before becoming resources.';
