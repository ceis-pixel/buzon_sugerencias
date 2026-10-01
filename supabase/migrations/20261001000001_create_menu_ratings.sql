-- Migration: Create daily_menus, menu_ratings, menu_rating_limits and submit_menu_rating RPC
-- Version: 20261001000001
-- Sprint: 11 (Daily Menu Rating, Real-Time Satisfaction Thermometer and Nutritional Management)
-- Issue: 11.1 (Database Migration for Daily Menus and Ratings)

BEGIN;

-- 1. Ensure cryptographic extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure auth.users mock exists for isolated test runners if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    CREATE TABLE auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT
    );
  END IF;
END $$;

-- 2. Table: daily_menus (Published university dining hall menus)
CREATE TABLE IF NOT EXISTS public.daily_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift public.shift_type NOT NULL,
  main_dish VARCHAR(150) NOT NULL,
  side_dish VARCHAR(150),
  beverage VARCHAR(100),
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_daily_menu UNIQUE (date, shift)
);

-- Indexes for daily_menus
CREATE INDEX IF NOT EXISTS idx_daily_menus_date_shift
  ON public.daily_menus (date, shift);

CREATE INDEX IF NOT EXISTS idx_daily_menus_active_date
  ON public.daily_menus (is_active, date DESC);

-- Trigger for daily_menus.updated_at
CREATE OR REPLACE FUNCTION update_daily_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_menus_updated_at ON public.daily_menus;
CREATE TRIGGER trg_daily_menus_updated_at
  BEFORE UPDATE ON public.daily_menus
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_menus_updated_at();

-- 3. Table: menu_ratings (Dissociated, anonymous ratings)
CREATE TABLE IF NOT EXISTS public.menu_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.daily_menus(id) ON DELETE CASCADE,
  rating_main SMALLINT NOT NULL CHECK (rating_main BETWEEN 1 AND 5),
  rating_side SMALLINT CHECK (rating_side BETWEEN 1 AND 5),
  rating_beverage SMALLINT CHECK (rating_beverage BETWEEN 1 AND 5),
  shift public.shift_type NOT NULL,
  rating_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for menu_ratings
CREATE INDEX IF NOT EXISTS idx_menu_ratings_menu_id
  ON public.menu_ratings (menu_id);

CREATE INDEX IF NOT EXISTS idx_menu_ratings_date_shift
  ON public.menu_ratings (rating_date, shift);

-- 4. Table: menu_rating_limits (Ephemeral hash anti-spam rate limiting)
CREATE TABLE IF NOT EXISTS public.menu_rating_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_hash VARCHAR(64) NOT NULL,
  shift public.shift_type NOT NULL,
  rating_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_menu_rate_hash_shift_date UNIQUE (rate_hash, shift, rating_date)
);

-- Index for menu_rating_limits lookup
CREATE INDEX IF NOT EXISTS idx_menu_rating_limits_lookup
  ON public.menu_rating_limits (rate_hash, shift, rating_date);

-- 5. Row Level Security (RLS) Configuration

-- 5.1 daily_menus RLS
ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;

-- Allow public (anon, authenticated) to view all daily menus
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_menus' AND policyname = 'daily_menus_select_all'
  ) THEN
    CREATE POLICY "daily_menus_select_all"
      ON public.daily_menus
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_menus' AND policyname = 'daily_menus_admin_insert'
  ) THEN
    CREATE POLICY "daily_menus_admin_insert"
      ON public.daily_menus
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_menus' AND policyname = 'daily_menus_admin_update'
  ) THEN
    CREATE POLICY "daily_menus_admin_update"
      ON public.daily_menus
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_menus' AND policyname = 'daily_menus_admin_delete'
  ) THEN
    CREATE POLICY "daily_menus_admin_delete"
      ON public.daily_menus
      FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- 5.2 menu_ratings RLS
ALTER TABLE public.menu_ratings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'menu_ratings' AND policyname = 'menu_ratings_select_all'
  ) THEN
    CREATE POLICY "menu_ratings_select_all"
      ON public.menu_ratings
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Restrict direct insertion on menu_ratings: insertions only permitted through submit_menu_rating RPC
REVOKE INSERT, UPDATE, DELETE ON TABLE public.menu_ratings FROM anon, authenticated;
GRANT SELECT ON TABLE public.menu_ratings TO anon, authenticated;
GRANT ALL ON TABLE public.menu_ratings TO service_role;

-- 5.3 menu_rating_limits RLS
ALTER TABLE public.menu_rating_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.menu_rating_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.menu_rating_limits TO service_role;

-- 6. RPC Function: submit_menu_rating (Zero-Knowledge, 1 Vote per Student per Shift per Day)
CREATE OR REPLACE FUNCTION public.submit_menu_rating(
  p_menu_id UUID,
  p_shift public.shift_type,
  p_rating_main SMALLINT,
  p_rating_side SMALLINT DEFAULT NULL,
  p_rating_beverage SMALLINT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_email text;
  v_salt_secret text;
  v_rate_hash text;
  v_menu public.daily_menus%ROWTYPE;
  v_new_rating public.menu_ratings%ROWTYPE;
BEGIN
  -- 1. Validar sesión activa en Supabase Auth
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida o expirada. Debes iniciar sesión institucional.';
  END IF;

  -- 2. Validar que el correo pertenezca al dominio institucional @unsch.edu.pe
  v_user_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF NOT (v_user_email LIKE '%@unsch.edu.pe') THEN
    RAISE EXCEPTION 'Acceso denegado: solo cuentas @unsch.edu.pe pueden calificar el menú.';
  END IF;

  -- 3. Validar rangos de puntuación
  IF p_rating_main < 1 OR p_rating_main > 5 THEN
    RAISE EXCEPTION 'La calificación del plato principal debe ser entre 1 y 5 estrellas.';
  END IF;

  IF p_rating_side IS NOT NULL AND (p_rating_side < 1 OR p_rating_side > 5) THEN
    RAISE EXCEPTION 'La calificación de la sopa o entrada debe ser entre 1 y 5 estrellas.';
  END IF;

  IF p_rating_beverage IS NOT NULL AND (p_rating_beverage < 1 OR p_rating_beverage > 5) THEN
    RAISE EXCEPTION 'La calificación del refresco o bebida debe ser entre 1 y 5 estrellas.';
  END IF;

  -- 4. Validar existencia y disponibilidad del menú diario
  SELECT * INTO v_menu
  FROM public.daily_menus
  WHERE id = p_menu_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El menú especificado no existe.';
  END IF;

  IF v_menu.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'La calificación para este menú está cerrada o inactiva.';
  END IF;

  IF v_menu.shift <> p_shift THEN
    RAISE EXCEPTION 'El turno seleccionado no coincide con el menú.';
  END IF;

  -- 5. Generación del hash efímero con salt del servidor
  v_salt_secret := COALESCE(
    NULLIF(current_setting('app.settings.rate_limit_salt', true), ''),
    'unsch_dining_hall_salt_seed_2026'
  );

  v_rate_hash := encode(
    digest(
      concat(auth.uid()::text, '_', CURRENT_DATE::text, '_', p_shift::text, '_', v_salt_secret),
      'sha256'
    ),
    'hex'
  );

  -- 6. Verificar si el estudiante ya votó en este turno hoy
  IF EXISTS (
    SELECT 1
    FROM public.menu_rating_limits
    WHERE rate_hash = v_rate_hash
      AND shift = p_shift
      AND rating_date = CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Ya registraste tu opinión para el turno de hoy. ¡Gracias por participar!';
  END IF;

  -- 7. Registrar límite efímero anti-spam
  INSERT INTO public.menu_rating_limits (rate_hash, shift, rating_date)
  VALUES (v_rate_hash, p_shift, CURRENT_DATE);

  -- 8. Inserción disociada en calificaciones (sin user_id ni email)
  INSERT INTO public.menu_ratings (
    menu_id,
    rating_main,
    rating_side,
    rating_beverage,
    shift,
    rating_date
  )
  VALUES (
    p_menu_id,
    p_rating_main,
    p_rating_side,
    p_rating_beverage,
    p_shift,
    CURRENT_DATE
  )
  RETURNING * INTO v_new_rating;

  -- 9. Retornar confirmación
  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_rating.id,
    'menu_id', v_new_rating.menu_id,
    'shift', v_new_rating.shift,
    'rating_date', v_new_rating.rating_date,
    'created_at', v_new_rating.created_at
  );
END;
$$;

-- Revocar permisos públicos y conceder a authenticated y service_role
REVOKE ALL ON FUNCTION public.submit_menu_rating(
  UUID, public.shift_type, SMALLINT, SMALLINT, SMALLINT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_menu_rating(
  UUID, public.shift_type, SMALLINT, SMALLINT, SMALLINT
) TO authenticated, service_role;

-- 7. Helper RPC: has_user_rated_today (Zero-Knowledge status check for current student)
CREATE OR REPLACE FUNCTION public.has_user_rated_today(
  p_shift public.shift_type
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_salt_secret text;
  v_rate_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_salt_secret := COALESCE(
    NULLIF(current_setting('app.settings.rate_limit_salt', true), ''),
    'unsch_dining_hall_salt_seed_2026'
  );

  v_rate_hash := encode(
    digest(
      concat(auth.uid()::text, '_', CURRENT_DATE::text, '_', p_shift::text, '_', v_salt_secret),
      'sha256'
    ),
    'hex'
  );

  RETURN EXISTS (
    SELECT 1
    FROM public.menu_rating_limits
    WHERE rate_hash = v_rate_hash
      AND shift = p_shift
      AND rating_date = CURRENT_DATE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.has_user_rated_today(public.shift_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_user_rated_today(public.shift_type) TO authenticated, service_role;

COMMIT;
