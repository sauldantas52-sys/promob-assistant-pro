-- Adicionar coluna para prazos e audios
alter table public.maintenance_requests 
add column if not exists deadline timestamptz,
add column if not exists audio_url text;

-- Criar tabela de historico de assistencia
create table if not exists public.maintenance_history (
    id uuid primary key default gen_random_uuid(),
    request_id uuid references public.maintenance_requests(id) on delete cascade not null,
    created_by uuid references auth.users(id) not null,
    old_status public.maintenance_status,
    new_status public.maintenance_status,
    notes text,
    created_at timestamptz default now()
);

-- Grants
grant select, insert on public.maintenance_history to authenticated;
grant all on public.maintenance_history to service_role;

-- RLS
alter table public.maintenance_history enable row level security;

-- Policies
drop policy if exists "Users can view maintenance history of their company" on public.maintenance_history;
create policy "Users can view maintenance history of their company" 
on public.maintenance_history for select to authenticated 
using (request_id in (select id from public.maintenance_requests where company_id in (select company_id from public.profiles where id = auth.uid())));

drop policy if exists "Users can insert history for their company" on public.maintenance_history;
create policy "Users can insert history for their company" 
on public.maintenance_history for insert to authenticated 
with check (request_id in (select id from public.maintenance_requests where company_id in (select company_id from public.profiles where id = auth.uid())));
