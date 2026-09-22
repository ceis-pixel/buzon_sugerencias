-- Migration: Create suggestions table and domain enums
-- Version: 20260922000001
-- Sprint: 3 (Data Model and Storage in Supabase)
-- Issue: 3.1

-- 1. Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Domain Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_type') THEN
    CREATE TYPE shift_type AS ENUM ('breakfast', 'lunch', 'dinner');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suggestion_category') THEN
    CREATE TYPE suggestion_category AS ENUM (
      'menu',
      'hygiene',
      'portion',
      'service',
      'infrastructure'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('pending', 'in_review', 'resolved');
  END IF;
END $$;

-- 3. Table: suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code VARCHAR(16) UNIQUE,
  shift shift_type NOT NULL,
  category suggestion_category NOT NULL,
  message TEXT NOT NULL CHECK (
    char_length(message) <= 500 AND char_length(trim(message)) >= 10
  ),
  photo_url TEXT NULL,
  status ticket_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Performance Indexes
-- Unique index on ticket_code for instant tracking queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_suggestions_ticket_code
  ON suggestions (ticket_code);

-- Composite index on (status, created_at DESC) for admin inbox sorting
CREATE INDEX IF NOT EXISTS idx_suggestions_status_created_at
  ON suggestions (status, created_at DESC);

-- Index on shift for metric grouping and reporting
CREATE INDEX IF NOT EXISTS idx_suggestions_shift
  ON suggestions (shift);

-- 5. Trigger for updated_at column
CREATE OR REPLACE FUNCTION update_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suggestions_updated_at ON suggestions;
CREATE TRIGGER trg_suggestions_updated_at
  BEFORE UPDATE ON suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_suggestions_updated_at();

-- 6. Row Level Security (RLS)
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Provisional insert policy for anonymous and authenticated clients
-- (Will be refined in subsequent security issues)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'suggestions' AND policyname = 'Allow public insert to suggestions'
  ) THEN
    CREATE POLICY "Allow public insert to suggestions"
      ON suggestions
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;
