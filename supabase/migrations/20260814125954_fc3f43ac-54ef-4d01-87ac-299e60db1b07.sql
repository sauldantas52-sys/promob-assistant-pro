create type public.app_role as enum ('admin', 'escritorio', 'fabrica', 'montador');

create table public.companies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz default now()
);

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade not null,
    company_id uuid references public.companies(id),
    full_name text,
    created_at timestamptz default now()
);

create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    unique (user_id, role)
);

create table public.projects (
    id uuid primary key default gen_random_uuid(),
    company_id uuid references public.companies(id) not null,
    name text not null,
    client_name text,
    status text default 'novo',
    created_at timestamptz default now()
);

-- Grants
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;

-- RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.projects enable row level security;

-- Policies
create policy "Users can view their company" on public.companies for select to authenticated using (id in (select company_id from public.profiles where id = auth.uid()));
create policy "Users can view their profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users can view their own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "Users can view projects of their company" on public.projects for select to authenticated using (company_id in (select company_id from public.profiles where id = auth.uid()));

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;