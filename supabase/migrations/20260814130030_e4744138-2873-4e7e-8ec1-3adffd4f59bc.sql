-- Revoke all to satisfy the linter. RLS uses the function internally.
revoke all on function public.has_role(uuid, app_role) from public;
revoke all on function public.has_role(uuid, app_role) from authenticated;
revoke all on function public.has_role(uuid, app_role) from anon;
grant execute on function public.has_role(uuid, app_role) to service_role;
