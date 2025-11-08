-- Migration: Parent-Child Resource Relationships
-- Enables multi-location organizations to have one parent with multiple child locations
-- Example: BACS (parent) → BACS Oakland Housing, BACS Oakland Mental Health (children)

-- Add parent-child relationship fields and provenance tracking
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS parent_resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_name TEXT,
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS change_log JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.resources.parent_resource_id IS 'Reference to parent resource for multi-location organizations';
COMMENT ON COLUMN public.resources.org_name IS 'Normalized organization name for grouping (e.g., "Bay Area Community Services")';
COMMENT ON COLUMN public.resources.location_name IS 'Specific location identifier (e.g., "Oakland Office", "Housing Program")';
COMMENT ON COLUMN public.resources.is_parent IS 'True if this resource is a parent organization with child locations';
COMMENT ON COLUMN public.resources.change_log IS 'Provenance/audit log tracking all changes to this resource (JSONB array)';

-- Create index for efficient parent-child queries
CREATE INDEX IF NOT EXISTS idx_resources_parent_id ON public.resources(parent_resource_id);
CREATE INDEX IF NOT EXISTS idx_resources_org_name ON public.resources(org_name);
CREATE INDEX IF NOT EXISTS idx_resources_is_parent ON public.resources(is_parent) WHERE is_parent = true;

-- Create index for deduplication queries (address-based)
CREATE INDEX IF NOT EXISTS idx_resources_address_lookup
  ON public.resources(lower(address), lower(city), lower(state))
  WHERE status = 'active';

-- Add constraint: parent resources cannot have a parent themselves (no nested hierarchies)
ALTER TABLE public.resources
  ADD CONSTRAINT chk_parent_no_parent
  CHECK (
    (is_parent = false) OR
    (is_parent = true AND parent_resource_id IS NULL)
  );

-- Add constraint: child resources must have address
ALTER TABLE public.resources
  ADD CONSTRAINT chk_child_has_address
  CHECK (
    (parent_resource_id IS NULL) OR
    (parent_resource_id IS NOT NULL AND address IS NOT NULL)
  );

-- Function to auto-populate org_name from name if not provided
CREATE OR REPLACE FUNCTION auto_populate_org_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If org_name is not set, extract from name
  -- Removes common location suffixes like "- Oakland Office", "(San Francisco)"
  IF NEW.org_name IS NULL THEN
    NEW.org_name := regexp_replace(
      NEW.name,
      '\s*(-|–|—|\()\s*(Oakland|San Francisco|Berkeley|SF|East Bay|Bay Area)?\s*(Office|Location|Site|Center|Branch|Program)?\s*\)?$',
      '',
      'i'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate org_name
DROP TRIGGER IF EXISTS trigger_auto_populate_org_name ON public.resources;
CREATE TRIGGER trigger_auto_populate_org_name
  BEFORE INSERT OR UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_org_name();

-- Function to update parent resource's is_parent flag when children are added/removed
CREATE OR REPLACE FUNCTION update_parent_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- If a child is being added
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.parent_resource_id IS NOT NULL THEN
    UPDATE public.resources
    SET is_parent = true
    WHERE id = NEW.parent_resource_id AND is_parent = false;
  END IF;

  -- If a child is being removed or deleted
  IF (TG_OP = 'UPDATE' AND OLD.parent_resource_id IS NOT NULL AND NEW.parent_resource_id IS NULL) OR
     (TG_OP = 'DELETE' AND OLD.parent_resource_id IS NOT NULL) THEN
    -- Check if parent still has other children
    PERFORM id FROM public.resources
    WHERE parent_resource_id = OLD.parent_resource_id
    LIMIT 1;

    -- If no children remain, set is_parent to false
    IF NOT FOUND THEN
      UPDATE public.resources
      SET is_parent = false
      WHERE id = OLD.parent_resource_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update is_parent flag
DROP TRIGGER IF EXISTS trigger_update_parent_flag ON public.resources;
CREATE TRIGGER trigger_update_parent_flag
  AFTER INSERT OR UPDATE OR DELETE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_flag();

-- View: Get all child locations for a parent resource
CREATE OR REPLACE VIEW resource_children AS
SELECT
  r.*,
  p.name as parent_name,
  p.org_name as parent_org_name
FROM public.resources r
JOIN public.resources p ON r.parent_resource_id = p.id
WHERE r.parent_resource_id IS NOT NULL
  AND r.status = 'active';

-- View: Get all parent resources with child count
CREATE OR REPLACE VIEW resource_parents AS
SELECT
  r.*,
  COUNT(c.id) as child_count
FROM public.resources r
LEFT JOIN public.resources c ON c.parent_resource_id = r.id AND c.status = 'active'
WHERE r.is_parent = true
  AND r.status = 'active'
GROUP BY r.id;

-- Function to find potential duplicates based on address similarity
-- Returns pairs of resource IDs that might be duplicates
CREATE OR REPLACE FUNCTION find_potential_duplicates(
  similarity_threshold FLOAT DEFAULT 0.8
)
RETURNS TABLE (
  resource_id_1 UUID,
  resource_id_2 UUID,
  name_1 TEXT,
  name_2 TEXT,
  address_1 TEXT,
  address_2 TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r1.id as resource_id_1,
    r2.id as resource_id_2,
    r1.name as name_1,
    r2.name as name_2,
    r1.address as address_1,
    r2.address as address_2,
    similarity(lower(r1.address), lower(r2.address)) as similarity_score
  FROM public.resources r1
  CROSS JOIN public.resources r2
  WHERE r1.id < r2.id  -- Avoid duplicate pairs
    AND r1.status = 'active'
    AND r2.status = 'active'
    AND r1.parent_resource_id IS NULL  -- Don't flag children as duplicates
    AND r2.parent_resource_id IS NULL
    AND similarity(lower(r1.address), lower(r2.address)) >= similarity_threshold
  ORDER BY similarity_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_trgm extension for fuzzy text matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for fuzzy name/address matching
CREATE INDEX IF NOT EXISTS idx_resources_name_trgm ON public.resources USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_address_trgm ON public.resources USING gin (lower(address) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_org_name_trgm ON public.resources USING gin (lower(org_name) gin_trgm_ops);

-- ============================================================================
-- PROVENANCE / AUDIT LOGGING
-- Automatically tracks who/what/when/where for all resource changes
-- ============================================================================

-- Function to log changes to change_log field (admin-only visibility)
CREATE OR REPLACE FUNCTION log_resource_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val UUID;
  user_email_val TEXT;
  change_entry JSONB;
  changed_fields TEXT[];
BEGIN
  -- Get current user info (if authenticated)
  user_id_val := auth.uid();

  -- Get user email if available
  IF user_id_val IS NOT NULL THEN
    SELECT email INTO user_email_val FROM auth.users WHERE id = user_id_val;
  END IF;

  -- On INSERT
  IF (TG_OP = 'INSERT') THEN
    change_entry := jsonb_build_object(
      'timestamp', now(),
      'action', 'created',
      'source', COALESCE(NEW.source, 'unknown'),
      'user_id', user_id_val,
      'user_email', user_email_val,
      'initial_data', jsonb_build_object(
        'name', NEW.name,
        'address', NEW.address,
        'city', NEW.city,
        'state', NEW.state,
        'primary_category', NEW.primary_category
      )
    );

    NEW.change_log := NEW.change_log || change_entry;
    RETURN NEW;
  END IF;

  -- On UPDATE
  IF (TG_OP = 'UPDATE') THEN
    changed_fields := ARRAY[]::TEXT[];

    -- Track what fields changed
    IF OLD.name != NEW.name THEN
      changed_fields := array_append(changed_fields, 'name');
    END IF;
    IF OLD.address != NEW.address OR OLD.city != NEW.city OR OLD.state != NEW.state OR OLD.zip != NEW.zip THEN
      changed_fields := array_append(changed_fields, 'location');
    END IF;
    IF OLD.phone != NEW.phone OR OLD.email != NEW.email OR OLD.website != NEW.website THEN
      changed_fields := array_append(changed_fields, 'contact');
    END IF;
    IF OLD.description != NEW.description THEN
      changed_fields := array_append(changed_fields, 'description');
    END IF;
    IF OLD.primary_category != NEW.primary_category OR OLD.categories != NEW.categories THEN
      changed_fields := array_append(changed_fields, 'categories');
    END IF;
    IF OLD.services_offered != NEW.services_offered THEN
      changed_fields := array_append(changed_fields, 'services');
    END IF;
    IF OLD.status != NEW.status THEN
      changed_fields := array_append(changed_fields, 'status');
    END IF;
    IF OLD.verified != NEW.verified THEN
      changed_fields := array_append(changed_fields, 'verification');
    END IF;
    IF OLD.parent_resource_id != NEW.parent_resource_id THEN
      changed_fields := array_append(changed_fields, 'parent_relationship');
    END IF;

    -- Only log if something actually changed
    IF array_length(changed_fields, 1) > 0 THEN
      change_entry := jsonb_build_object(
        'timestamp', now(),
        'action', 'updated',
        'user_id', user_id_val,
        'user_email', user_email_val,
        'changed_fields', changed_fields,
        'previous_values', jsonb_build_object(
          'name', CASE WHEN OLD.name != NEW.name THEN OLD.name ELSE NULL END,
          'status', CASE WHEN OLD.status != NEW.status THEN OLD.status ELSE NULL END
        )
      );

      NEW.change_log := NEW.change_log || change_entry;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically log all changes
DROP TRIGGER IF EXISTS trigger_log_resource_changes ON public.resources;
CREATE TRIGGER trigger_log_resource_changes
  BEFORE INSERT OR UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION log_resource_changes();

-- RLS Policy: Only admins can see change_log field
-- Note: This is enforced at the application level when selecting fields
-- Admins use SELECT * to see all fields
-- Public users use SELECT (specific fields excluding change_log)

-- ============================================================================
-- DEDUPLICATION RPC FUNCTIONS
-- Used by import system to find similar resources
-- ============================================================================

-- Function to find similar resources using fuzzy matching
-- Returns resources with similarity scores for deduplication
CREATE OR REPLACE FUNCTION find_similar_resources(
  search_name TEXT,
  search_address TEXT,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  org_name TEXT,
  parent_resource_id UUID,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.address,
    r.city,
    r.state,
    r.zip,
    r.org_name,
    r.parent_resource_id,
    GREATEST(
      similarity(lower(r.name), lower(search_name)),
      similarity(lower(r.address), lower(search_address))
    ) as similarity_score
  FROM public.resources r
  WHERE r.status = 'active'
    AND (
      similarity(lower(r.name), lower(search_name)) >= similarity_threshold
      OR similarity(lower(r.address), lower(search_address)) >= similarity_threshold
    )
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;
