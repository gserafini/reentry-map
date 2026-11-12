-- B085 (2026-11-12): replace the yes/no accepts-records flag with source-backed fields.
-- Every listing exists to serve people with records, so accepts_records carried no
-- information: it defaulted to TRUE, 5,752 active rows were true, none false.
-- Expand phase: add the new fields, stop defaulting the old one and clear its values.
-- Back up accepts_records before applying (scripts take a private export). Drop later.

ALTER TABLE resources ADD COLUMN IF NOT EXISTS record_restrictions TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS reentry_focused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE resources ALTER COLUMN accepts_records DROP DEFAULT;
UPDATE resources SET accepts_records = NULL WHERE accepts_records IS NOT NULL;

COMMENT ON COLUMN resources.record_restrictions IS
  'Source-backed record-related restrictions (registry, offense, supervision). NULL = none stated.';
COMMENT ON COLUMN resources.reentry_focused IS
  'TRUE only when a source says the program is specifically for people with criminal records.';
COMMENT ON COLUMN resources.accepts_records IS
  'DEPRECATED (B085): meaningless default flag; not displayed or written. To be dropped.';
