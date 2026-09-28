-- Migration: Add admin SELECT and UPDATE policies to suggestions table
-- Version: 20260922000009
-- Sprint: 8 (Admin Dashboard and Moderation)
-- Issue: 8.1 & 8.4

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'suggestions' AND policyname = 'suggestions_admin_select'
  ) THEN
    CREATE POLICY "suggestions_admin_select"
      ON public.suggestions
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'suggestions' AND policyname = 'suggestions_admin_update'
  ) THEN
    CREATE POLICY "suggestions_admin_update"
      ON public.suggestions
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;
