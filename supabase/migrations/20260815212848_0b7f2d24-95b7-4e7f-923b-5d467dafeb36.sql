create table if not exists public.pricing_configs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid references public.companies(id) not null,
    material_name text not null,
    cost_per_m2 numeric not null default 0,
    edge_cost_per_m numeric not null default 0,
    markup_percent numeric not null default 0,
    created_at timestamp with time zone default now()
);

create table if not exists public.project_estimates (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) not null,
    items jsonb not null default '[]',
    total_value numeric not null default 0,
    status text not null default 'rascunho',
    created_at timestamp with time zone default now()
);

grant all on public.pricing_configs to authenticated;
grant all on public.pricing_configs to service_role;
grant all on public.project_estimates to authenticated;
grant all on public.project_estimates to service_role;

alter table public.pricing_configs enable row level security;
alter table public.project_estimates enable row level security;

do $$ 
begin
    if not exists (select 1 from pg_policies where policyname = 'Acesso por empresa' and tablename = 'pricing_configs') then
        create policy "Acesso por empresa" on public.pricing_configs for all to authenticated using (company_id = (select company_id from public.profiles where id = auth.uid()));
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Acesso por empresa' and tablename = 'project_estimates') then
        create policy "Acesso por empresa" on public.project_estimates for all to authenticated using (project_id in (select id from public.projects where company_id = (select company_id from public.profiles where id = auth.uid())));
    end if;
end $$;