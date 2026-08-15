-- Migration 20260817002000_assign_requested_company_admin.sql
insert into public.user_roles (user_id, role)
select auth_user.id, 'admin'::public.app_role
from auth.users auth_user
join public.profiles profile on profile.id = auth_user.id
where profile.company_id is not null
  and md5(lower(trim(auth_user.email))) = '8158e82e1afaadb61e5e4e4d5df78848'
on conflict (user_id, role) do nothing;