-- Migration: Create ticket_responses table, indexes, and RLS policies
-- Version: 20260922000003
-- Sprint: 3 (Data Model and Storage in Supabase)
-- Issue: 3.3

-- 1. Table: ticket_responses (Official responses and moderation notes)
CREATE TABLE IF NOT EXISTS public.ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  responder_email VARCHAR(255) NOT NULL REFERENCES public.admins(email) ON UPDATE CASCADE,
  response_text TEXT NOT NULL CHECK (char_length(trim(response_text)) >= 5),
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Performance & Audit Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_responses_suggestion_id
  ON public.ticket_responses (suggestion_id);

CREATE INDEX IF NOT EXISTS idx_ticket_responses_responder_email
  ON public.ticket_responses (responder_email);

-- 3. Trigger for updated_at column
CREATE OR REPLACE FUNCTION update_ticket_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_responses_updated_at ON public.ticket_responses;
CREATE TRIGGER trg_ticket_responses_updated_at
  BEFORE UPDATE ON public.ticket_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_responses_updated_at();

-- 4. Row Level Security (RLS)
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;

-- 4.1. Public Read Policy:
-- Any user (anonymous or authenticated) can read official public responses (is_internal = false)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ticket_responses' AND policyname = 'ticket_responses_public_read'
  ) THEN
    CREATE POLICY "ticket_responses_public_read"
      ON public.ticket_responses
      FOR SELECT
      TO anon, authenticated
      USING (is_internal = false);
  END IF;
END $$;

-- 4.2. Moderation Read Policy:
-- Authorized moderators can read all responses, including private internal notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ticket_responses' AND policyname = 'ticket_responses_admin_read'
  ) THEN
    CREATE POLICY "ticket_responses_admin_read"
      ON public.ticket_responses
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- 4.3. Moderation Insert Policy:
-- Only authorized moderators can post responses or internal notes under their verified email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ticket_responses' AND policyname = 'ticket_responses_admin_insert'
  ) THEN
    CREATE POLICY "ticket_responses_admin_insert"
      ON public.ticket_responses
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.is_admin()
        AND responder_email = lower(auth.jwt() ->> 'email')
      );
  END IF;
END $$;

-- 4.4. Moderation Update Policy:
-- Only authorized moderators can update responses, maintaining identity integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ticket_responses' AND policyname = 'ticket_responses_admin_update'
  ) THEN
    CREATE POLICY "ticket_responses_admin_update"
      ON public.ticket_responses
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (
        public.is_admin()
        AND responder_email = lower(auth.jwt() ->> 'email')
      );
  END IF;
END $$;
