create or replace function public.normalize_store_credit_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.current_balance := new.opening_balance;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

drop trigger if exists normalize_store_credit_account_trigger on public.store_credit_accounts;
create trigger normalize_store_credit_account_trigger
before insert on public.store_credit_accounts
for each row execute function public.normalize_store_credit_account();

create or replace function public.preserve_company_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tenant_company_id uuid;
  admin_count integer;
begin
  if old.role <> 'admin'::public.app_role
    or (tg_op = 'UPDATE' and new.role = 'admin'::public.app_role) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select company_id into tenant_company_id from public.profiles where id = old.user_id;
  perform 1 from public.companies where id = tenant_company_id for update;
  select count(*) into admin_count
  from public.user_roles role
  join public.profiles profile on profile.id = role.user_id
  where profile.company_id = tenant_company_id and role.role = 'admin'::public.app_role;
  if admin_count <= 1 then raise exception 'company_requires_admin'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists preserve_company_admin_trigger on public.user_roles;
create trigger preserve_company_admin_trigger
before update of role or delete on public.user_roles
for each row execute function public.preserve_company_admin();

drop policy if exists "Company members can create projects" on public.projects;
drop policy if exists "Company members can update projects" on public.projects;
drop policy if exists "Company members can delete projects" on public.projects;
create policy "Technical roles can create projects" on public.projects
for insert to authenticated
with check (company_id = public.current_company_id() and public.can_manage_projects());
create policy "Technical roles can update projects" on public.projects
for update to authenticated
using (company_id = public.current_company_id() and public.can_manage_projects())
with check (company_id = public.current_company_id() and public.can_manage_projects());
create policy "Technical roles can delete projects" on public.projects
for delete to authenticated
using (company_id = public.current_company_id() and public.can_manage_projects());

drop policy if exists "Company members manage modules" on public.modules;
create policy "Company members view modules" on public.modules
for select to authenticated
using (project_id in (select id from public.projects where company_id = public.current_company_id()));
create policy "Technical roles create modules" on public.modules
for insert to authenticated
with check (
  public.can_manage_projects()
  and project_id in (select id from public.projects where company_id = public.current_company_id())
);
create policy "Operational roles update modules" on public.modules
for update to authenticated
using (
  project_id in (select id from public.projects where company_id = public.current_company_id())
  and (
    public.can_manage_projects()
    or public.has_role(auth.uid(), 'fabrica'::public.app_role)
    or public.has_role(auth.uid(), 'montador'::public.app_role)
  )
)
with check (
  project_id in (select id from public.projects where company_id = public.current_company_id())
  and (
    public.can_manage_projects()
    or public.has_role(auth.uid(), 'fabrica'::public.app_role)
    or public.has_role(auth.uid(), 'montador'::public.app_role)
  )
);
create policy "Technical roles delete modules" on public.modules
for delete to authenticated
using (
  public.can_manage_projects()
  and project_id in (select id from public.projects where company_id = public.current_company_id())
);

drop policy if exists "Company members manage parts" on public.parts;
create policy "Company members view parts" on public.parts
for select to authenticated
using (project_id in (select id from public.projects where company_id = public.current_company_id()));
create policy "Technical roles create parts" on public.parts
for insert to authenticated
with check (
  public.can_manage_projects()
  and project_id in (select id from public.projects where company_id = public.current_company_id())
);
create policy "Operational roles update parts" on public.parts
for update to authenticated
using (
  project_id in (select id from public.projects where company_id = public.current_company_id())
  and (
    public.can_manage_projects()
    or public.has_role(auth.uid(), 'fabrica'::public.app_role)
    or public.has_role(auth.uid(), 'montador'::public.app_role)
  )
)
with check (
  project_id in (select id from public.projects where company_id = public.current_company_id())
  and (
    public.can_manage_projects()
    or public.has_role(auth.uid(), 'fabrica'::public.app_role)
    or public.has_role(auth.uid(), 'montador'::public.app_role)
  )
);
create policy "Technical roles delete parts" on public.parts
for delete to authenticated
using (
  public.can_manage_projects()
  and project_id in (select id from public.projects where company_id = public.current_company_id())
);

create or replace function public.validate_commercial_tenant_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  if tg_table_name = 'projects' and row_data ->> 'client_id' is not null and not exists (
    select 1 from public.clients
    where id = (row_data ->> 'client_id')::uuid
      and company_id = (row_data ->> 'company_id')::uuid
  ) then raise exception 'project_client_company_mismatch';
  elsif tg_table_name = 'store_credit_accounts' and not exists (
    select 1 from public.suppliers
    where id = (row_data ->> 'supplier_id')::uuid
      and company_id = (row_data ->> 'company_id')::uuid
  ) then raise exception 'supplier_company_mismatch';
  elsif tg_table_name = 'financial_documents' and row_data ->> 'supplier_id' is not null and not exists (
    select 1 from public.suppliers
    where id = (row_data ->> 'supplier_id')::uuid
      and company_id = (row_data ->> 'company_id')::uuid
  ) then raise exception 'document_supplier_company_mismatch';
  elsif tg_table_name = 'store_credit_transactions' and (
    not exists (
      select 1 from public.store_credit_accounts
      where id = (row_data ->> 'account_id')::uuid
        and company_id = (row_data ->> 'company_id')::uuid
    )
    or (row_data ->> 'document_id' is not null and not exists (
      select 1 from public.financial_documents
      where id = (row_data ->> 'document_id')::uuid
        and company_id = (row_data ->> 'company_id')::uuid
    ))
  ) then raise exception 'credit_transaction_company_mismatch';
  elsif tg_table_name = 'supplier_offers' and (
    not exists (
      select 1 from public.suppliers
      where id = (row_data ->> 'supplier_id')::uuid
        and company_id = (row_data ->> 'company_id')::uuid
    )
    or (row_data ->> 'source_document_id' is not null and not exists (
      select 1 from public.financial_documents
      where id = (row_data ->> 'source_document_id')::uuid
        and company_id = (row_data ->> 'company_id')::uuid
    ))
  ) then raise exception 'offer_reference_company_mismatch';
  elsif tg_table_name = 'outsourcing_orders' and (
    not exists (
      select 1 from public.suppliers
      where id = (row_data ->> 'supplier_id')::uuid
        and company_id = (row_data ->> 'company_id')::uuid
    )
    or not exists (
      select 1 from public.projects
      where id = (row_data ->> 'project_id')::uuid
        and company_id = (row_data ->> 'company_id')::uuid
    )
    or (row_data ->> 'xml_file_id' is not null and not exists (
      select 1 from public.project_files
      where id = (row_data ->> 'xml_file_id')::uuid
        and project_id = (row_data ->> 'project_id')::uuid
    ))
  ) then raise exception 'outsourcing_reference_mismatch';
  elsif tg_table_name = 'communication_outbox'
    and row_data ->> 'outsourcing_order_id' is not null and not exists (
    select 1 from public.outsourcing_orders
    where id = (row_data ->> 'outsourcing_order_id')::uuid
      and company_id = (row_data ->> 'company_id')::uuid
  ) then raise exception 'outbox_order_company_mismatch';
  elsif tg_table_name = 'visual_analysis_sessions'
    and row_data ->> 'project_id' is not null and not exists (
    select 1 from public.projects
    where id = (row_data ->> 'project_id')::uuid
      and company_id = (row_data ->> 'company_id')::uuid
  ) then raise exception 'visual_session_project_company_mismatch';
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects', 'store_credit_accounts', 'financial_documents', 'store_credit_transactions',
    'supplier_offers', 'outsourcing_orders', 'communication_outbox', 'visual_analysis_sessions'
  ] loop
    execute format('drop trigger if exists validate_tenant_references_trigger on public.%I', table_name);
    execute format(
      'create trigger validate_tenant_references_trigger before insert or update on public.%I '
      'for each row execute function public.validate_commercial_tenant_references()',
      table_name
    );
  end loop;
end
$$;

alter table public.communication_outbox
  drop constraint if exists communication_outbox_status_check;
alter table public.communication_outbox
  add constraint communication_outbox_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled', 'delivery_unknown'));

create unique index if not exists communication_outbox_active_order_key
on public.communication_outbox (outsourcing_order_id, channel)
where outsourcing_order_id is not null
  and status in ('pending', 'processing', 'sent', 'delivery_unknown');

-- Existing releases predate evidence links. Relock them for explicit technical revalidation.
alter table public.projects disable trigger enforce_project_lock_changes_trigger;
alter table public.validation_checks disable trigger relock_project_after_check_reopened_trigger;
update public.validation_checks
set is_completed = false,
    completed_by = null,
    completed_at = null,
    evidence_source = null,
    evidence_file_id = null,
    updated_at = now()
where is_completed = true and evidence_source is null;
alter table public.validation_checks enable trigger relock_project_after_check_reopened_trigger;
alter table public.parts disable trigger enforce_part_machining_lock_changes_trigger;
update public.projects
set machining_blocked = true, is_validated = false, updated_at = now()
where machining_blocked = false or is_validated = true;
update public.parts set machining_blocked = true where machining_blocked = false;
alter table public.parts enable trigger enforce_part_machining_lock_changes_trigger;
alter table public.projects enable trigger enforce_project_lock_changes_trigger;
