-- Add website screenshot fields to resources table
-- Screenshots captured during resource creation/update to show on detail pages

-- URL to screenshot image in Supabase Storage
ALTER TABLE resources ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Timestamp when screenshot was captured
ALTER TABLE resources ADD COLUMN IF NOT EXISTS screenshot_captured_at TIMESTAMPTZ;

-- Create storage bucket for screenshots (public read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resource-screenshots',
  'resource-screenshots',
  true,
  5242880, -- 5MB max file size
  ARRAY['image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Public read access for screenshots'
  ) THEN
    CREATE POLICY "Public read access for screenshots"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'resource-screenshots');
  END IF;
END $$;

-- Storage policy: Authenticated users can upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated users can upload screenshots'
  ) THEN
    CREATE POLICY "Authenticated users can upload screenshots"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'resource-screenshots'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Storage policy: Authenticated users can update screenshots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated users can update screenshots'
  ) THEN
    CREATE POLICY "Authenticated users can update screenshots"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'resource-screenshots'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Storage policy: Authenticated users can delete screenshots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated users can delete screenshots'
  ) THEN
    CREATE POLICY "Authenticated users can delete screenshots"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'resource-screenshots'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN resources.screenshot_url IS 'Public URL to website screenshot (JPG) in Supabase Storage';
COMMENT ON COLUMN resources.screenshot_captured_at IS 'Timestamp when screenshot was last captured';
