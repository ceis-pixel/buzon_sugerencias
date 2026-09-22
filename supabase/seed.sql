-- Supabase Seed Data
-- Base authorized moderators whitelist

INSERT INTO public.admins (email, full_name, role, is_active)
VALUES
  ('salud.fusch@unsch.edu.pe', 'Secretaría de Salud y Nutrición FUSCH', 'admin', true),
  ('rivaldo.moderador@unsch.edu.pe', 'Rivaldo', 'moderator', true),
  ('uriel.pillaca@unsch.edu.pe', 'Uriel Carlos Pillaca Rodriguez', 'admin', true)
ON CONFLICT (email) DO NOTHING;
