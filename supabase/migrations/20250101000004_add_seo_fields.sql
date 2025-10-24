-- Migration: Add SEO-friendly URL fields to resources table
-- Date: 2025-01-01
-- Purpose: Enable SEO-friendly URLs like /resources/ca/alameda/resource-name

-- Add new columns for SEO-friendly URLs
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS county TEXT;

-- Create unique index on slug to ensure no duplicates
CREATE UNIQUE INDEX IF NOT EXISTS resources_slug_idx ON public.resources(slug);

-- Create index on state for filtering
CREATE INDEX IF NOT EXISTS resources_state_idx ON public.resources(state);

-- Create index on county for filtering
CREATE INDEX IF NOT EXISTS resources_county_idx ON public.resources(county);

-- Create composite index for the full SEO path lookup
CREATE INDEX IF NOT EXISTS resources_seo_path_idx ON public.resources(state, county, slug);

-- Add comments
COMMENT ON COLUMN public.resources.slug IS 'URL-friendly slug generated from resource name';
COMMENT ON COLUMN public.resources.state IS 'Two-letter state abbreviation (lowercase)';
COMMENT ON COLUMN public.resources.county IS 'County name as slug (lowercase, hyphenated)';

-- Function to generate slug from text
CREATE OR REPLACE FUNCTION public.generate_slug(text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(trim(text), '[^\w\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract state from address
CREATE OR REPLACE FUNCTION public.extract_state(address TEXT)
RETURNS TEXT AS $$
DECLARE
  state_match TEXT;
BEGIN
  IF address IS NULL THEN
    RETURN NULL;
  END IF;

  -- Match pattern: ", CA" or " CA " followed by optional zip
  state_match := substring(address FROM ',\s*([A-Z]{2})(?:\s+\d{5})?');

  IF state_match IS NOT NULL THEN
    RETURN lower(state_match);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract county from address or name
CREATE OR REPLACE FUNCTION public.extract_county(address TEXT, name TEXT)
RETURNS TEXT AS $$
DECLARE
  county_match TEXT;
  address_parts TEXT[];
BEGIN
  -- Try to find "County" in the resource name first
  IF name IS NOT NULL THEN
    county_match := substring(name FROM '([A-Za-z\s]+)\s+County');
    IF county_match IS NOT NULL THEN
      RETURN public.generate_slug(county_match);
    END IF;
  END IF;

  -- Try to extract city/county from address
  IF address IS NOT NULL THEN
    address_parts := string_to_array(address, ',');
    IF array_length(address_parts, 1) >= 2 THEN
      RETURN public.generate_slug(trim(address_parts[2]));
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing resources with generated SEO fields
UPDATE public.resources
SET
  slug = public.generate_slug(name),
  state = public.extract_state(address),
  county = public.extract_county(address, name)
WHERE slug IS NULL;

-- Create trigger to automatically generate SEO fields on insert/update
CREATE OR REPLACE FUNCTION public.update_resource_seo_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate slug from name if not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;

  -- Extract state from address if not provided
  IF NEW.state IS NULL OR NEW.state = '' THEN
    NEW.state := public.extract_state(NEW.address);
  END IF;

  -- Extract county from address/name if not provided
  IF NEW.county IS NULL OR NEW.county = '' THEN
    NEW.county := public.extract_county(NEW.address, NEW.name);
  END IF;

  -- Handle slug uniqueness by appending number if needed
  IF EXISTS (SELECT 1 FROM public.resources WHERE slug = NEW.slug AND id != NEW.id) THEN
    DECLARE
      counter INTEGER := 1;
      new_slug TEXT;
    BEGIN
      LOOP
        new_slug := NEW.slug || '-' || counter::TEXT;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.resources WHERE slug = new_slug AND id != NEW.id);
        counter := counter + 1;
      END LOOP;
      NEW.slug := new_slug;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_resource_seo_fields_trigger ON public.resources;
CREATE TRIGGER update_resource_seo_fields_trigger
  BEFORE INSERT OR UPDATE OF name, address, slug, state, county
  ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_resource_seo_fields();

-- Add constraint to ensure slug is not empty if name exists
ALTER TABLE public.resources
  ADD CONSTRAINT resources_slug_not_empty CHECK (slug IS NULL OR length(slug) > 0);
