-- Migration: Create submit_anonymous_suggestion RPC function
-- Version: 20260922000007
-- Sprint: 4 (Institutional Authentication and Anonymous Dissociation)
-- Issue: 4.4

BEGIN;

CREATE OR REPLACE FUNCTION public.submit_anonymous_suggestion(
  p_shift public.shift_type,
  p_category public.suggestion_category,
  p_message text,
  p_photo_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_new_suggestion public.suggestions%ROWTYPE;
  v_clean_message text;
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

  -- 4. Inserción disociada (sin user_id ni email)
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

  -- 5. Retornar información esencial del ticket al cliente
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
