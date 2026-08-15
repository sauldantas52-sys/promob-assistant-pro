-- Recover the original company owner when legacy signup left the company without an admin role.
insert into public.user_roles (user_id, role)
select profile.id, 'admin'::public.app_role
from public.profiles profile
where profile.company_id is not null
  and not exists (
    select 1
    from public.user_roles own_role
    where own_role.user_id = profile.id
  )
  and not exists (
    select 1
    from public.profiles company_profile
    join public.user_roles company_role on company_role.user_id = company_profile.id
    where company_profile.company_id = profile.company_id
      and company_role.role = 'admin'::public.app_role
  )
  and profile.id = (
    select first_profile.id
    from public.profiles first_profile
    where first_profile.company_id = profile.company_id
    order by first_profile.created_at asc nulls last, first_profile.id
    limit 1
  )
on conflict (user_id, role) do nothing;
