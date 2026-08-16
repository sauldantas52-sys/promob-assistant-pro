-- supabase/migrations/20260818000000_add_business_roles.sql
alter type public.app_role add value if not exists 'projetista';
alter type public.app_role add value if not exists 'comercial';
