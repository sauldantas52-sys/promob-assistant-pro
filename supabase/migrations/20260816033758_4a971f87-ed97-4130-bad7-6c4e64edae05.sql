-- Fix project_import_sessions schema and planned_paths
alter table public.project_import_sessions add column if not exists created_by uuid references auth.users(id) on delete cascade;
alter table public.project_import_sessions add column if not exists planned_paths text[];

-- Migration 3: RPC for complete client project creation
create or replace function public.create_complete_client_project(
  _client jsonb,
  _site jsonb,
  _project jsonb,
  _files jsonb,
  _modules jsonb,
  _loose_parts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  project_company_id uuid := public.current_company_id();
  new_client_id uuid;
  new_site_id uuid;
  new_project_id uuid;
begin
  if auth.uid() is null or project_company_id is null then
    raise exception 'authentication_required';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
    or public.has_role(auth.uid(), 'projetista'::public.app_role)
  ) then
    raise exception 'project_creation_forbidden';
  end if;

  insert into public.clients (
    company_id,
    name,
    tax_id,
    email,
    phone
  ) values (
    project_company_id,
    trim(_client->>'name'),
    nullif(trim(_client->>'tax_id'), ''),
    nullif(trim(_client->>'email'), ''),
    nullif(trim(_client->>'phone'), '')
  )
  on conflict (company_id, tax_id) where tax_id is not null
  do update set
    name = excluded.name,
    email = coalesce(excluded.email, clients.email),
    phone = coalesce(excluded.phone, clients.phone)
  returning id into new_client_id;

  if new_client_id is null then
    select id into new_client_id from public.clients
    where company_id = project_company_id and name = trim(_client->>'name')
    limit 1;
  end if;

  insert into public.project_sites (
    company_id,
    client_id,
    name,
    address,
    city,
    state,
    zip_code
  ) values (
    project_company_id,
    new_client_id,
    coalesce(trim(_site->>'name'), 'Principal'),
    nullif(trim(_site->>'address'), ''),
    nullif(trim(_site->>'city'), ''),
    nullif(trim(_site->>'state'), ''),
    nullif(trim(_site->>'zip_code'), '')
  )
  returning id into new_site_id;

  select public.import_client_project(
    coalesce((_project->>'id')::uuid, gen_random_uuid()),
    _project || jsonb_build_object('client_name', _client->>'name'),
    _files,
    _modules,
    _loose_parts
  ) into new_project_id;

  update public.projects
  set client_id = new_client_id,
      site_id = new_site_id
  where id = new_project_id;

  return new_project_id;
end;
$$;
revoke all on function public.create_complete_client_project(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.create_complete_client_project(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Migration 4: Safety triggers and locks
create or replace function public.prevent_operational_mutation_after_corte()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_status text;
begin
  select status into project_status
  from public.projects
  where id = new.project_id;

  if project_status not in ('novo', 'orcamento') then
    if new.kind <> old.kind 
      or new.material <> old.material
      or new.thickness_mm <> old.thickness_mm
      or new.width_mm <> old.width_mm
      or new.length_mm <> old.length_mm then
      raise exception 'part_mutation_forbidden_after_corte';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_part_mutation_trigger on public.parts;
create trigger prevent_part_mutation_trigger
before update on public.parts
for each row execute function public.prevent_operational_mutation_after_corte();

-- Migration 5: Legacy import
create or replace function public.import_legacy_store_credits(_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'admin_only';
  end if;

  for item in select * from jsonb_array_elements(_payload) loop
    insert into public.store_credit_accounts (
      company_id,
      supplier_id,
      balance,
      currency
    ) values (
      (item->>'company_id')::uuid,
      (item->>'supplier_id')::uuid,
      (item->>'balance')::numeric,
      coalesce(item->>'currency', 'BRL')
    )
    on conflict (company_id, supplier_id) do update
    set balance = excluded.balance;
  end loop;
end;
$$;

-- Migration 6: Tenant isolation triggers
create or replace function public.validate_tenant_isolation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is distinct from public.current_company_id() then
    raise exception 'tenant_isolation_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_client_tenant_trigger on public.clients;
create trigger validate_client_tenant_trigger
before insert on public.clients
for each row execute function public.validate_tenant_isolation();

drop trigger if exists validate_site_tenant_trigger on public.project_sites;
create trigger validate_site_tenant_trigger
before insert on public.project_sites
for each row execute function public.validate_tenant_isolation();
