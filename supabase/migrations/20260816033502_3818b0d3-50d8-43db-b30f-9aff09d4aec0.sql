-- Part 1.1: Constraints and Base Functions
with ranked_roles as (
  select
    id,
    row_number() over (
      partition by user_id
      order by case role::text
        when 'admin' then 1
        when 'projetista' then 2
        when 'comercial' then 3
        when 'escritorio' then 4
        when 'fabrica' then 5
        when 'montador' then 6
        else 7
      end,
      id
    ) as position
  from public.user_roles
)
delete from public.user_roles role
using ranked_roles ranked
where role.id = ranked.id and ranked.position > 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_roles'::regclass
      and conname = 'user_roles_user_id_key'
  ) then
    alter table public.user_roles add constraint user_roles_user_id_key unique (user_id);
  end if;
end
$$;

alter table public.profiles drop constraint if exists profiles_operator_code_key;
create unique index if not exists profiles_operator_code_normalized_key
on public.profiles (upper(operator_code))
where operator_code is not null;

create or replace function public.can_manage_commercial()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin'::public.app_role, 'comercial'::public.app_role)
  )
$$;

create or replace function public.can_manage_projects()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in (
        'admin'::public.app_role,
        'projetista'::public.app_role,
        'escritorio'::public.app_role
      )
  )
$$;

revoke all on function public.can_manage_commercial() from public, anon;
revoke all on function public.can_manage_projects() from public, anon;
grant execute on function public.can_manage_commercial() to authenticated, service_role;
grant execute on function public.can_manage_projects() to authenticated, service_role;
