-- helper: current user's company
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select company_id from public.profiles where id = auth.uid() $$;

revoke all on function public.current_company_id() from public, anon;
grant execute on function public.current_company_id() to authenticated, service_role;

-- bootstrap policies
create policy "Authenticated can create company" on public.companies for insert to authenticated with check (true);
create policy "Users can update own company" on public.companies for update to authenticated using (id = public.current_company_id());
create policy "Users can create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Users can update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "Users can claim first role" on public.user_roles for insert to authenticated
  with check (user_id = auth.uid() and not exists (select 1 from public.user_roles ur where ur.user_id = auth.uid()));
grant insert on public.user_roles to authenticated;

-- projects write access
create policy "Company members can create projects" on public.projects for insert to authenticated with check (company_id = public.current_company_id());
create policy "Company members can update projects" on public.projects for update to authenticated using (company_id = public.current_company_id());
create policy "Company members can delete projects" on public.projects for delete to authenticated using (company_id = public.current_company_id());

-- extra project fields
alter table public.projects
  add column if not exists environment text,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

-- modules
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  environment text,
  width_mm numeric,
  height_mm numeric,
  depth_mm numeric,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.modules to authenticated;
grant all on public.modules to service_role;
alter table public.modules enable row level security;
create policy "Company members manage modules" on public.modules for all to authenticated
  using (project_id in (select id from public.projects where company_id = public.current_company_id()))
  with check (project_id in (select id from public.projects where company_id = public.current_company_id()));

-- parts (peças / chapas / ferragens)
create table public.parts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  kind text not null default 'peca',
  name text not null,
  material text,
  thickness_mm numeric,
  width_mm numeric,
  length_mm numeric,
  quantity numeric not null default 1,
  unit text default 'un',
  edge_banding text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.parts to authenticated;
grant all on public.parts to service_role;
alter table public.parts enable row level security;
create policy "Company members manage parts" on public.parts for all to authenticated
  using (project_id in (select id from public.projects where company_id = public.current_company_id()))
  with check (project_id in (select id from public.projects where company_id = public.current_company_id()));

-- imported files metadata
create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null,
  file_type text,
  size_bytes bigint,
  summary jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.project_files to authenticated;
grant all on public.project_files to service_role;
alter table public.project_files enable row level security;
create policy "Company members manage project files" on public.project_files for all to authenticated
  using (project_id in (select id from public.projects where company_id = public.current_company_id()))
  with check (project_id in (select id from public.projects where company_id = public.current_company_id()));