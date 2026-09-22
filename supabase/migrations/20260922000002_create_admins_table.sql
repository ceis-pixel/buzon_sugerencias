-- Migration: Create admins table, security helper function and RLS policies
-- Version: 20260922000002
-- Sprint: 3 (Data Model and Storage in Supabase)
-- Issue: 3.2

-- 1. Table: admins (Authorized moderators whitelist)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@unsch\.edu\.pe$'
  ),
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'moderator' CHECK (
    role IN ('admin', 'moderator')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Performance & Security Indexes
CREATE INDEX IF NOT EXISTS idx_admins_email_active
  ON public.admins (email, is_active);

-- 3. Trigger for updated_at column
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admins_updated_at ON public.admins;
CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admins_updated_at();

-- 4. Helper Security Function: is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE email = lower(auth.jwt() ->> 'email')
      AND is_active = true
  );
$$;

-- Grant execution permission on public.is_admin()
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 5. Row Level Security (RLS)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Allow only active authenticated administrators/moderators to view the whitelist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admins' AND policyname = 'admins_select_policy'
  ) THEN
    CREATE POLICY "admins_select_policy"
      ON public.admins
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- 6. Seed Data: Default Authorized Moderators Whitelist
INSERT INTO public.admins (email, full_name, role, is_active)
VALUES
  ('salud.fusch@unsch.edu.pe', 'Secretaría de Salud y Nutrición FUSCH', 'admin', true),
  ('rivaldo.moderador@unsch.edu.pe', 'Rivaldo', 'moderator', true),
  ('uriel.pillaca@unsch.edu.pe', 'Uriel Carlos Pillaca Rodriguez', 'admin', true)
ON CONFLICT (email) DO NOTHING;
