-- Migration: Store correct instants regardless of the session time zone
-- Version: 20261006000001
--
-- Several timestamptz columns defaulted to timezone('utc', now()). That
-- expression yields a timestamp WITHOUT time zone, which PostgreSQL then
-- reinterprets in the session time zone. On a server running in
-- America/Lima every value was stored five hours in the future.
-- now() already returns the correct instant.

BEGIN;

ALTER TABLE public.admins
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.ticket_responses
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.submission_rate_limits
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.daily_menus
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.menu_ratings
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.menu_rating_limits
  ALTER COLUMN created_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ticket_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_daily_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
