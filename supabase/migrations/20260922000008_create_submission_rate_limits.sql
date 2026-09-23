-- Migration: Create submission_rate_limits table and update submit_anonymous_suggestion RPC
-- Version: 20260922000008
-- Sprint: 4 (Institutional Authentication and Anonymous Dissociation)
-- Issue: 4.5 (Ephemeral Salted Hash Anti-Spam Rate Limiting)

BEGIN;

-- 1. Ensure cryptographic extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create ephemeral rate limits table for zero-knowledge rate limiting
CREATE TABLE IF NOT EXISTS public.submission_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_hash VARCHAR(64) NOT NULL,
  shift public.shift_type NOT NULL,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  submission_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_rate_hash_shift_date UNIQUE (rate_hash, shift, submission_date)
);

-- 3. Composite search index for high-performance quota evaluation
CREATE INDEX IF NOT EXISTS idx_submission_rate_limits_lookup
  ON public.submission_rate_limits (rate_hash, shift, submission_date);

-- 4. Restrict table access: strictly internal to SECURITY DEFINER functions
ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.submission_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.submission_rate_limits TO service_role;

-- 5. Refactor submit_anonymous_suggestion RPC to enforce zero-knowledge rate limits
CREATE OR REPLACE FUNCTION public.submit_anonymous_suggestion(
  p_shift public.shift_type,
  p_category public.suggestion_category,
  p_message text,
  p_photo_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_email text;
  v_clean_message text;
  v_salt_secret text;
  v_rate_hash text;
  v_current_count integer := 0;
  v_new_suggestion public.suggestions%ROWTYPE;
BEGIN
  -- 1. Validar sesión activa en Supabase Auth
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida o expirada. Debes iniciar sesión institucional.';
  END IF;

  -- 2. Validar que el correo pertenezca al dominio institucional @unsch.edu.pe
  v_user_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF NOT (v_user_email LIKE '%@unsch.edu.pe') THEN
    RAISE EXCEPTION 'Acceso denegado: solo cuentas @unsch.edu.pe pueden enviar sugerencias.';
  END IF;

  -- 3. Sanitizar y validar longitud del mensaje
  v_clean_message := trim(p_message);
  IF char_length(v_clean_message) < 10 THEN
    RAISE EXCEPTION 'El mensaje es demasiado corto (mínimo 10 caracteres).';
  END IF;
  IF char_length(v_clean_message) > 500 THEN
    RAISE EXCEPTION 'El mensaje excede el límite máximo de 500 caracteres.';
  END IF;

  -- 4. Generación del hash efímero con salt del servidor
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

  -- 5. Consultar y verificar el conteo actual para este turno y fecha
  SELECT submission_count INTO v_current_count
  FROM public.submission_rate_limits
  WHERE rate_hash = v_rate_hash
    AND shift = p_shift
    AND submission_date = CURRENT_DATE;

  -- Límite estricto: máximo 2 sugerencias por turno por estudiante
  IF COALESCE(v_current_count, 0) >= 2 THEN
    RAISE EXCEPTION 'Has alcanzado el límite de 2 reportes para este turno (%). Podrás enviar otra observación en el siguiente turno.', p_shift;
  END IF;

  -- 6. Actualizar o insertar el registro de control de tasa
  INSERT INTO public.submission_rate_limits (rate_hash, shift, submission_date, submission_count)
  VALUES (v_rate_hash, p_shift, CURRENT_DATE, 1)
  ON CONFLICT (rate_hash, shift, submission_date)
  DO UPDATE SET
    submission_count = submission_rate_limits.submission_count + 1,
    updated_at = timezone('utc'::text, now());

  -- 7. Inserción disociada en sugerencias (sin user_id ni email)
  INSERT INTO public.suggestions (
    shift,
    category,
    message,
    photo_url
  )
  VALUES (
    p_shift,
    p_category,
    v_clean_message,
    p_photo_url
  )
  RETURNING * INTO v_new_suggestion;

  -- 8. Retornar información esencial del ticket al cliente
  RETURN jsonb_build_object(
    'id', v_new_suggestion.id,
    'ticket_code', v_new_suggestion.ticket_code,
    'shift', v_new_suggestion.shift,
    'category', v_new_suggestion.category,
    'status', v_new_suggestion.status,
    'created_at', v_new_suggestion.created_at
  );
END;
$$;

-- Revocar permisos públicos y conceder únicamente a authenticated y service_role
REVOKE ALL ON FUNCTION public.submit_anonymous_suggestion(
  public.shift_type, public.suggestion_category, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_anonymous_suggestion(
  public.shift_type, public.suggestion_category, text, text
) TO authenticated, service_role;

COMMIT;
