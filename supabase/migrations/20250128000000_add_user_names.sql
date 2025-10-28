-- Migration: Add first_name and last_name to users table
-- Description: Replace single 'name' field with separate first_name and last_name fields

-- Add new columns
ALTER TABLE users
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Migrate existing data from name field to first_name
-- (assumes name field contains full name, split on first space)
UPDATE users
SET
  first_name = CASE
    WHEN name IS NOT NULL AND position(' ' in name) > 0
    THEN split_part(name, ' ', 1)
    ELSE name
  END,
  last_name = CASE
    WHEN name IS NOT NULL AND position(' ' in name) > 0
    THEN substring(name from position(' ' in name) + 1)
    ELSE NULL
  END
WHERE name IS NOT NULL;

-- Drop old name column
ALTER TABLE users DROP COLUMN name;

-- Add comments
COMMENT ON COLUMN users.first_name IS 'User first name';
COMMENT ON COLUMN users.last_name IS 'User last name';
