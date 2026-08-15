-- Create maintenance types
do $$ begin
    if not exists (select 1 from pg_type where typname = 'maintenance_type') then
        create type public.maintenance_type as enum ('defeito', 'dano_transporte', 'erro_projeto', 'erro_montagem', 'outros');
    end if;
    if not exists (select 1 from pg_type where typname = 'maintenance_urgency') then
        create type public.maintenance_urgency as enum ('baixa', 'media', 'alta', 'critica');
    end if;
    if not exists (select 1 from pg_type where typname = 'maintenance_status') then
        create type public.maintenance_status as enum ('aberto', 'em_analise', 'producao', 'enviado', 'concluido');
    end if;
end $$;

-- Create maintenance_requests table
create table if not exists public.maintenance_requests (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    module_id uuid references public.modules(id) on delete set null,
    part_id uuid references public.parts(id) on delete set null,
    company_id uuid references public.companies(id) not null,
    created_by uuid references auth.users(id) not null,
    description text not null,
    type public.maintenance_type not null default 'defeito',
    urgency public.maintenance_urgency not null default 'baixa',
    status public.maintenance_status not null default 'aberto',
    photos text[] default '{}',
    created_at timestamptz default now()
);

-- Grants
grant select, insert, update on public.maintenance_requests to authenticated;
grant all on public.maintenance_requests to service_role;

-- RLS
alter table public.maintenance_requests enable row level security;

-- Policies
drop policy if exists "Users can view maintenance of their company" on public.maintenance_requests;
create policy "Users can view maintenance of their company" 
on public.maintenance_requests for select to authenticated 
using (company_id in (select company_id from public.profiles where id = auth.uid()));

drop policy if exists "Users can insert maintenance for their company" on public.maintenance_requests;
create policy "Users can insert maintenance for their company" 
on public.maintenance_requests for insert to authenticated 
with check (company_id in (select company_id from public.profiles where id = auth.uid()));

drop policy if exists "Users can update maintenance of their company" on public.maintenance_requests;
create policy "Users can update maintenance of their company" 
on public.maintenance_requests for update to authenticated 
using (company_id in (select company_id from public.profiles where id = auth.uid()));
