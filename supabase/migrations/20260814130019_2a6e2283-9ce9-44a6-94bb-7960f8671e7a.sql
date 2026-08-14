-- In Postgres, 'public' role includes everyone, including anon.
-- We must revoke from anon explicitly if revoke from public doesn't clear the linter.
-- But wait, standard Supabase 'public' schema permissions often grant execute to PUBLIC by default.

revoke execute on function public.has_role(uuid, app_role) from anon;
revoke all on function public.has_role(uuid, app_role) from public;
grant execute on function public.has_role(uuid, app_role) to authenticated;
grant execute on function public.has_role(uuid, app_role) to service_role;
