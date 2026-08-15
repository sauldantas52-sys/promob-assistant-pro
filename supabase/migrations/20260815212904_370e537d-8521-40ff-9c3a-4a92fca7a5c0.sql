alter table public.project_files 
add column if not exists storage_path text,
add column if not exists storage_status text default 'local';

create table if not exists public.project_import_sessions (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id),
    status text not null,
    step text not null,
    files text[] default '{}',
    company_id uuid references public.companies(id) not null,
    created_at timestamp with time zone default now()
);

grant all on public.project_import_sessions to authenticated;
grant all on public.project_import_sessions to service_role;

alter table public.project_import_sessions enable row level security;

do $$ 
begin
    if not exists (select 1 from pg_policies where policyname = 'Acesso por empresa' and tablename = 'project_import_sessions') then
        create policy "Acesso por empresa" on public.project_import_sessions for all to authenticated using (company_id = (select company_id from public.profiles where id = auth.uid()));
    end if;
end $$;