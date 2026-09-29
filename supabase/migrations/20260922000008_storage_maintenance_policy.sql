-- Migration: Storage maintenance policy and media purge RPC
-- Version: 20260922000008 (Storage Maintenance Policy)
-- Sprint: 10 (Impact Analytics, Critical Webhooks, Storage Maintenance)
-- Issue: 10.4 (Storage Maintenance Policy & RPC)

BEGIN;

CREATE OR REPLACE FUNCTION public.purge_orphaned_or_old_media(
  p_days_old integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_purged_count integer := 0;
  v_purged_urls text[] := ARRAY[]::text[];
  v_cutoff_date timestamptz;
BEGIN
  -- Verify admin rights if an authenticated user session is present
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren privilegios de administrador para ejecutar el mantenimiento de almacenamiento.';
  END IF;

  v_cutoff_date := timezone('utc'::text, now()) - (p_days_old || ' days')::interval;

  -- Collect photo_urls to be purged so the caller can remove them from the storage bucket
  SELECT COALESCE(array_agg(photo_url), ARRAY[]::text[])
  INTO v_purged_urls
  FROM public.suggestions
  WHERE status = 'resolved'
    AND photo_url IS NOT NULL
    AND photo_url <> ''
    AND created_at <= v_cutoff_date;

  -- Dissociate photo_url from suggestions to preserve textual data for statistical audit
  WITH updated AS (
    UPDATE public.suggestions
    SET photo_url = NULL,
        updated_at = timezone('utc'::text, now())
    WHERE status = 'resolved'
      AND photo_url IS NOT NULL
      AND photo_url <> ''
      AND created_at <= v_cutoff_date
    RETURNING id
  )
  SELECT count(*) INTO v_purged_count FROM updated;

  RETURN jsonb_build_object(
    'success', true,
    'purged_count', v_purged_count,
    'purged_urls', to_jsonb(v_purged_urls),
    'cutoff_date', v_cutoff_date,
    'executed_at', timezone('utc'::text, now())
  );
END;
$$;

-- Revoke from public, allow only authenticated users and service_role
REVOKE ALL ON FUNCTION public.purge_orphaned_or_old_media(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_orphaned_or_old_media(integer) TO authenticated, service_role;

COMMIT;
