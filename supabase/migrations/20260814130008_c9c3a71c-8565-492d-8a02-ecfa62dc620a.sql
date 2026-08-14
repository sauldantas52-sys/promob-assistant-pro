-- Revoke execute from public and authenticated for the has_role function
-- We will only grant execute if specifically needed, but security definer 
-- functions are risky if exposed to public/authenticated without careful checks.
-- For has_role, it's used in RLS, so it doesn't need to be directly executable by users via RPC.

revoke execute on function public.has_role(uuid, app_role) from public;
revoke execute on function public.has_role(uuid, app_role) from authenticated;
grant execute on function public.has_role(uuid, app_role) to service_role;
