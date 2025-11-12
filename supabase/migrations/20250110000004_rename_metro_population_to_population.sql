-- Rename metro_population to population in expansion_priorities table
-- This simplifies the API and makes the field name more intuitive

ALTER TABLE expansion_priorities
  RENAME COLUMN metro_population TO population;

-- Update any comments on the column
COMMENT ON COLUMN expansion_priorities.population IS 'Metro area population (used in priority scoring)';
