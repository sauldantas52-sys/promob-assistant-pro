-- Módulo: Orçamento e Propostas
create table public.project_quotes (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    company_id uuid not null,
    version integer default 1,
    status text not null check (status in ('rascunho', 'enviado', 'aprovado', 'rejeitado')),
    data jsonb not null default '{}',
    total_value numeric(12,2) not null default 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Módulo: Estoque e Auditoria de Crédito
create table public.inventory_logs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null,
    project_id uuid references public.projects(id),
    material_name text not null,
    type text not null check (type in ('entrada', 'saida', 'estorno')),
    quantity numeric(12,2) not null,
    previous_balance numeric(12,2) not null,
    new_balance numeric(12,2) not null,
    metadata jsonb default '{}',
    created_at timestamp with time zone default now()
);

-- Módulo: Fornecedores e Preços
create table public.supplier_prices (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null,
    supplier_name text not null,
    material_name text not null,
    price_per_unit numeric(12,2) not null,
    shipping_cost numeric(12,2) default 0,
    lead_time_days integer,
    availability boolean default true,
    last_update timestamp with time zone default now()
);

-- Permissões RLS
alter table public.project_quotes enable row level security;
alter table public.inventory_logs enable row level security;
alter table public.supplier_prices enable row level security;

grant all on public.project_quotes to authenticated;
grant all on public.inventory_logs to authenticated;
grant all on public.supplier_prices to authenticated;
grant all on public.project_quotes to service_role;
grant all on public.inventory_logs to service_role;
grant all on public.supplier_prices to service_role;

create policy "Empresas acessam apenas seus próprios orçamentos"
on public.project_quotes for all to authenticated
using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Empresas acessam seu próprio log de estoque"
on public.inventory_logs for all to authenticated
using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Empresas acessam seus fornecedores"
on public.supplier_prices for all to authenticated
using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Lock de segurança comercial na tabela projects
alter table public.projects add column if not exists commercial_approved boolean default false;
alter table public.projects add column if not exists official_cut_plan_validated boolean default false;
