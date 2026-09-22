-- Sprint 3, Issue 3.6: authoritative insertion defaults and update timestamps.
BEGIN;

-- Harden the existing generator without rewriting an applied migration.
-- The first byte of a v4 UUID is random; rejection sampling avoids modulo bias.
CREATE OR REPLACE FUNCTION public.generate_unique_ticket_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  characters constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  candidate_code text;
  random_byte integer;
BEGIN
  FOR attempt IN 1..50 LOOP
    candidate_code := 'UNSCH-';
    WHILE length(candidate_code) < 10 LOOP
      random_byte := get_byte(uuid_send(gen_random_uuid()), 0);
      IF random_byte < 240 THEN
        candidate_code := candidate_code || substr(characters, (random_byte % 30) + 1, 1);
      END IF;
    END LOOP;

    -- Matching inserts share a transaction lock until their rows are committed.
    PERFORM pg_advisory_xact_lock(362206, hashtext(candidate_code));
    IF NOT EXISTS (SELECT 1 FROM public.suggestions WHERE ticket_code = candidate_code) THEN
      RETURN candidate_code;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'No se pudo generar un código de ticket disponible. Inténtalo nuevamente.'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_suggestion_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.ticket_code IS NULL OR btrim(NEW.ticket_code) = '' THEN
    NEW.ticket_code := public.generate_unique_ticket_code();
  ELSE
    PERFORM pg_advisory_xact_lock(362206, hashtext(NEW.ticket_code));
  END IF;

  -- A caller cannot create an already reviewed or resolved suggestion.
  NEW.status := 'pending'::public.ticket_status;

  -- timestamptz stores an instant; converting now() to a naive UTC timestamp
  -- would incorrectly reinterpret it in the caller's session time zone.
  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Defaults are evaluated before BEFORE INSERT triggers.
ALTER TABLE public.suggestions
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS tr_set_suggestion_defaults ON public.suggestions;
CREATE TRIGGER tr_set_suggestion_defaults
BEFORE INSERT ON public.suggestions
FOR EACH ROW EXECUTE FUNCTION public.set_suggestion_defaults();

-- Replace the earlier timestamp trigger so each update runs exactly once.
DROP TRIGGER IF EXISTS trg_suggestions_updated_at ON public.suggestions;
DROP TRIGGER IF EXISTS tr_set_suggestions_updated_at ON public.suggestions;
CREATE TRIGGER tr_set_suggestions_updated_at
BEFORE UPDATE ON public.suggestions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP FUNCTION IF EXISTS public.update_suggestions_updated_at();

REVOKE ALL ON FUNCTION public.set_suggestion_defaults() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

-- Only this synthetic row is removed; any failure aborts the migration.
DO $$
DECLARE
  test_suggestion public.suggestions%ROWTYPE;
BEGIN
  INSERT INTO public.suggestions (shift, category, message)
  VALUES ('lunch', 'service', 'Prueba de integración de valores automáticos del ticket.')
  RETURNING * INTO test_suggestion;

  IF test_suggestion.ticket_code IS NULL
     OR test_suggestion.ticket_code !~ '^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$'
     OR test_suggestion.status IS DISTINCT FROM 'pending'::public.ticket_status
     OR test_suggestion.created_at IS DISTINCT FROM now()
     OR test_suggestion.updated_at IS DISTINCT FROM test_suggestion.created_at THEN
    RAISE EXCEPTION 'Falló la validación de los valores automáticos de la sugerencia.';
  END IF;

  DELETE FROM public.suggestions WHERE id = test_suggestion.id;
END;
$$;

COMMIT;
