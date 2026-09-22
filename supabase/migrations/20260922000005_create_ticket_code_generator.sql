-- Migration: Create PL/pgSQL function generate_unique_ticket_code
-- Version: 20260922000005
-- Sprint: 3 (Data Model and Storage in Supabase)
-- Issue: 3.5

-- 1. Function: generate_unique_ticket_code()
-- Generates unambiguous tracking codes in format UNSCH-XXXX (e.g., UNSCH-7K4M)
-- Excludes visually confusing characters: 0, O, 1, I, L (31 allowed characters)
CREATE OR REPLACE FUNCTION public.generate_unique_ticket_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  characters text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  candidate_code text;
  random_index integer;
  code_exists boolean;
  attempts integer := 0;
  max_attempts constant integer := 50;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > max_attempts THEN
      RAISE EXCEPTION 'Exceeded max attempts generating unique ticket code';
    END IF;

    candidate_code := 'UNSCH-';
    FOR i IN 1..4 LOOP
      random_index := floor(random() * length(characters) + 1)::integer;
      candidate_code := candidate_code || substr(characters, random_index, 1);
    END LOOP;

    SELECT EXISTS(
      SELECT 1 FROM public.suggestions WHERE ticket_code = candidate_code
    ) INTO code_exists;

    IF NOT code_exists THEN
      RETURN candidate_code;
    END IF;
  END LOOP;
END;
$$;

-- 2. Execution Permissions
REVOKE ALL ON FUNCTION public.generate_unique_ticket_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_unique_ticket_code() TO authenticated, anon, service_role;

-- 3. SQL Self-Test Verification Block
DO $$
DECLARE
  test_code text;
BEGIN
  test_code := public.generate_unique_ticket_code();
  IF NOT (test_code ~* '^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$') THEN
    RAISE EXCEPTION 'Ticket code format validation failed: %', test_code;
  END IF;
END $$;
