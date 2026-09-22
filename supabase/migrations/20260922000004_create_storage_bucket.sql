-- Migration: Create suggestion-media storage bucket and RLS policies
-- Version: 20260922000004
-- Sprint: 3 (Data Model and Storage in Supabase)
-- Issue: 3.4

-- 1. Register or update the suggestion-media bucket in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'suggestion-media',
  'suggestion-media',
  true,
  1048576, -- 1 MB (1,048,576 bytes)
  ARRAY['image/webp', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']::text[];

-- 2. Ensure Row Level Security is active on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Storage RLS Policies

-- 3.1. Public Read Policy:
-- Anyone (anonymous or authenticated) can view uploaded suggestion photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'suggestion_media_public_read'
  ) THEN
    CREATE POLICY "suggestion_media_public_read"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'suggestion-media');
  END IF;
END $$;

-- 3.2. Authenticated Upload Policy:
-- Verified institutional students can upload photos to the suggestion-media bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'suggestion_media_auth_upload'
  ) THEN
    CREATE POLICY "suggestion_media_auth_upload"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'suggestion-media'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- 3.3. Admin Delete Policy:
-- Only authorized moderators can delete uploaded photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'suggestion_media_admin_delete'
  ) THEN
    CREATE POLICY "suggestion_media_admin_delete"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'suggestion-media'
        AND public.is_admin() = true
      );
  END IF;
END $$;

-- 3.4. Admin Update Policy:
-- Only authorized moderators can modify uploaded media metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'suggestion_media_admin_update'
  ) THEN
    CREATE POLICY "suggestion_media_admin_update"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'suggestion-media'
        AND public.is_admin() = true
      );
  END IF;
END $$;
