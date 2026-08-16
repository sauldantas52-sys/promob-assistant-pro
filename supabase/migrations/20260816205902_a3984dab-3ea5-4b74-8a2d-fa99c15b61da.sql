-- DROP existing function to allow change of return type
drop function if exists public.import_legacy_store_credits(jsonb);

-- Migração 00: Adição de Papéis de Negócio
alter type public.app_role add value if not exists 'projetista';
alter type public.app_role add value if not exists 'comercial';

-- Migração 01: Infraestrutura Comercial e Acesso
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

create or replace function public.can_manage_commercial()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'comercial'))
$$;

create or replace function public.can_manage_projects()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'projetista', 'escritorio'))
$$;

grant execute on function public.can_manage_commercial() to authenticated, service_role;
grant execute on function public.can_manage_projects() to authenticated, service_role;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  document text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add column if not exists client_id uuid references public.clients(id);

create table if not exists public.project_sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  postal_code text, street text not null, number text not null, complement text, district text, city text not null, state text not null,
  reference text, contact_name text, contact_phone text, created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, legal_name text, tax_document text, contact_name text, whatsapp text,
  services text[] not null default '{}', active boolean not null default true,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.store_credit_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  opening_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (company_id, supplier_id)
);

grant select, insert, update on public.clients, public.project_sites, public.suppliers, public.store_credit_accounts to authenticated;
grant all on public.clients, public.project_sites, public.suppliers, public.store_credit_accounts to service_role;
alter table public.clients enable row level security;
alter table public.project_sites enable row level security;
alter table public.suppliers enable row level security;
alter table public.store_credit_accounts enable row level security;

-- Migração 03: create_complete_client_project RPC
create or replace function public.create_complete_client_project(
  _client jsonb, _project jsonb, _site jsonb, _environments jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  tenant_company_id uuid := public.current_company_id();
  selected_client_id uuid;
  created_project_id uuid;
begin
  if auth.uid() is null or tenant_company_id is null or not public.can_manage_projects() then
    raise exception 'project_create_forbidden';
  end if;
  selected_client_id := nullif(_client->>'id', '')::uuid;
  if selected_client_id is null then
    insert into public.clients (company_id, name, phone, email, document, created_by)
    values (tenant_company_id, trim(_client->>'name'), nullif(trim(_client->>'phone'), ''), nullif(trim(_client->>'email'), ''), nullif(trim(_client->>'document'), ''), auth.uid())
    returning id into selected_client_id;
  end if;
  insert into public.projects (company_id, client_id, client_name, name, status, machining_blocked, is_validated)
  values (tenant_company_id, selected_client_id, (select name from public.clients where id = selected_client_id), trim(_project->>'name'), 'novo', true, false)
  returning id into created_project_id;
  if length(trim(coalesce(_site->>'street', ''))) > 0 then
    insert into public.project_sites (project_id, street, number, city, state, contact_name, contact_phone)
    values (created_project_id, trim(_site->>'street'), trim(_site->>'number'), trim(_site->>'city'), upper(trim(_site->>'state')), trim(_site->>'contact_name'), trim(_site->>'contact_phone'));
  end if;
  return created_project_id;
end;
$$;
grant execute on function public.create_complete_client_project(jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Migração 05: import_legacy_store_credits RPC
create or replace function public.import_legacy_store_credits(_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  company uuid := public.current_company_id();
  imported_stores integer := 0;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'legacy_credit_import_forbidden';
  end if;
  return jsonb_build_object('importedStores', imported_stores, 'importedTransactions', 0);
end;
$$;
grant execute on function public.import_legacy_store_credits(jsonb) to authenticated;
