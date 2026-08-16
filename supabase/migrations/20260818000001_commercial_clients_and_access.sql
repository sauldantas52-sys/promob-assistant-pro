-- One deterministic role per user avoids ambiguous menus and authorization checks.
with ranked_roles as (
  select
    id,
    row_number() over (
      partition by user_id
      order by case role::text
        when 'admin' then 1
        when 'projetista' then 2
        when 'comercial' then 3
        when 'escritorio' then 4
        when 'fabrica' then 5
        when 'montador' then 6
        else 7
      end,
      id
    ) as position
  from public.user_roles
)
delete from public.user_roles role
using ranked_roles ranked
where role.id = ranked.id and ranked.position > 1;

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

alter table public.profiles drop constraint if exists profiles_operator_code_key;
create unique index if not exists profiles_operator_code_normalized_key
on public.profiles (upper(operator_code))
where operator_code is not null;

create or replace function public.can_manage_commercial()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin'::public.app_role, 'comercial'::public.app_role)
  )
$$;

create or replace function public.can_manage_projects()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in (
        'admin'::public.app_role,
        'projetista'::public.app_role,
        'escritorio'::public.app_role
      )
  )
$$;

revoke all on function public.can_manage_commercial() from public, anon;
revoke all on function public.can_manage_projects() from public, anon;
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
  updated_at timestamptz not null default now(),
  check (length(trim(name)) >= 2)
);
create index if not exists clients_company_name_idx on public.clients (company_id, lower(name));

alter table public.projects add column if not exists client_id uuid references public.clients(id);
create index if not exists projects_client_id_idx on public.projects (client_id);

create table if not exists public.project_sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  postal_code text,
  street text not null,
  number text not null,
  complement text,
  district text,
  city text not null,
  state text not null,
  reference text,
  contact_name text,
  contact_phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_environments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sequence integer not null default 1 check (sequence > 0),
  created_at timestamptz not null default now(),
  unique (project_id, name)
);
create index if not exists project_environments_project_sequence_idx
on public.project_environments (project_id, sequence);

create table if not exists public.project_appointments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('entrega', 'montagem', 'vistoria')),
  scheduled_at timestamptz not null,
  arrival_time text,
  status text not null default 'agendado' check (status in ('agendado', 'confirmado', 'em_rota', 'concluido', 'cancelado')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists project_appointments_schedule_idx
on public.project_appointments (scheduled_at, kind);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  legal_name text,
  tax_document text,
  contact_name text,
  whatsapp text,
  services text[] not null default '{}',
  average_lead_days integer check (average_lead_days is null or average_lead_days >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.store_credit_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  opening_balance numeric(14,2) not null default 0 check (opening_balance >= 0),
  current_balance numeric(14,2) not null default 0 check (current_balance >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, supplier_id)
);

create table if not exists public.financial_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  document_hash text not null,
  document_number text,
  document_date date,
  total_amount numeric(14,2) check (total_amount is null or total_amount > 0),
  ocr_text text,
  ocr_confidence numeric(5,4) check (ocr_confidence is null or ocr_confidence between 0 and 1),
  status text not null default 'review' check (status in ('review', 'confirmed', 'rejected')),
  created_by uuid references auth.users(id),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, document_hash)
);

create table if not exists public.store_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.store_credit_accounts(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid references public.financial_documents(id) on delete restrict,
  kind text not null check (kind in ('opening', 'purchase', 'adjustment', 'reversal')),
  amount numeric(14,2) not null check (amount > 0),
  previous_balance numeric(14,2) not null default 0,
  new_balance numeric(14,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'reversed')),
  reversal_of uuid references public.store_credit_transactions(id),
  idempotency_key uuid not null default gen_random_uuid(),
  notes text,
  created_by uuid not null references auth.users(id),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, idempotency_key)
);
create unique index if not exists store_credit_document_purchase_key
on public.store_credit_transactions (company_id, document_id)
where kind = 'purchase' and document_id is not null and status <> 'reversed';

create table if not exists public.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_name text not null,
  normalized_product text not null,
  brand text,
  unit text not null,
  package_quantity numeric(12,3) not null default 1 check (package_quantity > 0),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  shipping_cost numeric(14,2) not null default 0 check (shipping_cost >= 0),
  valid_until date,
  source_document_id uuid references public.financial_documents(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists supplier_offers_comparison_idx
on public.supplier_offers (company_id, normalized_product, valid_until);

create table if not exists public.outsourcing_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  xml_file_id uuid references public.project_files(id) on delete restrict,
  order_number text not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'sent', 'supplier_received', 'confirmed', 'in_production', 'ready', 'in_transit', 'received', 'checked', 'cancelled')),
  freight_amount numeric(14,2) not null default 0 check (freight_amount >= 0),
  requested_due_date date,
  message_text text,
  sent_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, order_number)
);

create table if not exists public.communication_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  outsourcing_order_id uuid references public.outsourcing_orders(id) on delete cascade,
  channel text not null check (channel = 'whatsapp'),
  recipient text not null,
  message_text text not null,
  attachment_path text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  provider_message_id text,
  attempt_count integer not null default 0,
  last_error text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.visual_analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_hash text,
  purpose text not null default 'COMMERCIAL_ONLY',
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'needs_review', 'reviewed', 'commercial_approved', 'rejected', 'superseded')),
  method text not null default 'COMERCIAL_ONLY',
  manufacturing_authority boolean not null default false check (manufacturing_authority = false),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.visual_analysis_findings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.visual_analysis_sessions(id) on delete cascade,
  page_number integer check (page_number is null or page_number > 0),
  finding_type text not null,
  original_text text,
  normalized_value jsonb,
  bounding_box jsonb,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  review_status text not null default 'pending' check (review_status in ('pending', 'confirmed', 'corrected', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;
alter table public.project_sites enable row level security;
alter table public.project_environments enable row level security;
alter table public.project_appointments enable row level security;
alter table public.suppliers enable row level security;
alter table public.store_credit_accounts enable row level security;
alter table public.financial_documents enable row level security;
alter table public.store_credit_transactions enable row level security;
alter table public.supplier_offers enable row level security;
alter table public.outsourcing_orders enable row level security;
alter table public.communication_outbox enable row level security;
alter table public.visual_analysis_sessions enable row level security;
alter table public.visual_analysis_findings enable row level security;

grant select, insert, update on public.clients, public.project_sites, public.project_environments, public.project_appointments to authenticated;
grant select, insert, update on public.suppliers, public.store_credit_accounts, public.financial_documents, public.supplier_offers, public.outsourcing_orders, public.visual_analysis_sessions, public.visual_analysis_findings to authenticated;
grant select on public.store_credit_transactions to authenticated;
grant select, insert on public.communication_outbox to authenticated;
grant all on public.clients, public.project_sites, public.project_environments, public.project_appointments, public.suppliers, public.store_credit_accounts, public.financial_documents, public.store_credit_transactions, public.supplier_offers, public.outsourcing_orders, public.communication_outbox, public.visual_analysis_sessions, public.visual_analysis_findings to service_role;

create policy "Company members view clients" on public.clients for select to authenticated
using (company_id = public.current_company_id());
create policy "Project managers create clients" on public.clients for insert to authenticated
with check (company_id = public.current_company_id() and public.can_manage_projects());
create policy "Project managers update clients" on public.clients for update to authenticated
using (company_id = public.current_company_id() and public.can_manage_projects())
with check (company_id = public.current_company_id() and public.can_manage_projects());

create policy "Company members view project sites" on public.project_sites for select to authenticated
using (project_id in (select id from public.projects where company_id = public.current_company_id()));
create policy "Project managers create project sites" on public.project_sites for insert to authenticated
with check (project_id in (select id from public.projects where company_id = public.current_company_id()) and public.can_manage_projects());
create policy "Project managers update project sites" on public.project_sites for update to authenticated
using (project_id in (select id from public.projects where company_id = public.current_company_id()) and public.can_manage_projects());

create policy "Company members view project environments" on public.project_environments for select to authenticated
using (project_id in (select id from public.projects where company_id = public.current_company_id()));
create policy "Project managers create project environments" on public.project_environments for insert to authenticated
with check (project_id in (select id from public.projects where company_id = public.current_company_id()) and public.can_manage_projects());
create policy "Project managers update project environments" on public.project_environments for update to authenticated
using (project_id in (select id from public.projects where company_id = public.current_company_id()) and public.can_manage_projects());

create policy "Company members view appointments" on public.project_appointments for select to authenticated
using (project_id in (select id from public.projects where company_id = public.current_company_id()));
create policy "Authorized roles manage appointments" on public.project_appointments for all to authenticated
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

create policy "Commercial network is visible to authorized roles" on public.suppliers for select to authenticated
using (
  company_id = public.current_company_id()
  and (
    public.can_manage_commercial()
    or public.can_manage_projects()
    or public.has_role(auth.uid(), 'auditor'::public.app_role)
  )
);
create policy "Commercial roles manage suppliers" on public.suppliers for all to authenticated
using (company_id = public.current_company_id() and public.can_manage_commercial())
with check (company_id = public.current_company_id() and public.can_manage_commercial());

create policy "Commercial roles view credit accounts" on public.store_credit_accounts for select to authenticated
using (company_id = public.current_company_id() and (public.can_manage_commercial() or public.has_role(auth.uid(), 'auditor'::public.app_role)));
create policy "Commercial roles create credit accounts" on public.store_credit_accounts for insert to authenticated
with check (company_id = public.current_company_id() and public.can_manage_commercial());

create policy "Commercial roles view financial documents" on public.financial_documents for select to authenticated
using (company_id = public.current_company_id() and (public.can_manage_commercial() or public.has_role(auth.uid(), 'auditor'::public.app_role)));
create policy "Commercial roles import financial documents" on public.financial_documents for insert to authenticated
with check (company_id = public.current_company_id() and public.can_manage_commercial());

create policy "Commercial roles view credit ledger" on public.store_credit_transactions for select to authenticated
using (company_id = public.current_company_id() and (public.can_manage_commercial() or public.has_role(auth.uid(), 'auditor'::public.app_role)));
create policy "Commercial roles prepare credit entries" on public.store_credit_transactions for insert to authenticated
with check (company_id = public.current_company_id() and created_by = auth.uid() and public.can_manage_commercial());

create policy "Authorized roles view supplier offers" on public.supplier_offers for select to authenticated
using (company_id = public.current_company_id() and (public.can_manage_commercial() or public.can_manage_projects() or public.has_role(auth.uid(), 'auditor'::public.app_role)));
create policy "Commercial roles manage supplier offers" on public.supplier_offers for all to authenticated
using (company_id = public.current_company_id() and public.can_manage_commercial())
with check (company_id = public.current_company_id() and public.can_manage_commercial());

create policy "Authorized roles view outsourcing" on public.outsourcing_orders for select to authenticated
using (company_id = public.current_company_id() and (public.can_manage_commercial() or public.can_manage_projects() or public.has_role(auth.uid(), 'auditor'::public.app_role)));
create policy "Commercial and project roles manage outsourcing" on public.outsourcing_orders for all to authenticated
using (company_id = public.current_company_id() and (public.can_manage_commercial() or public.can_manage_projects()))
with check (company_id = public.current_company_id() and created_by = auth.uid() and (public.can_manage_commercial() or public.can_manage_projects()));

create policy "Outbox visible to commercial roles" on public.communication_outbox for select to authenticated
using (company_id = public.current_company_id() and public.can_manage_commercial());
create policy "Authorized roles enqueue messages" on public.communication_outbox for insert to authenticated
with check (company_id = public.current_company_id() and created_by = auth.uid() and (public.can_manage_commercial() or public.can_manage_projects()));

create policy "Authorized roles view visual analysis" on public.visual_analysis_sessions for select to authenticated
using (company_id = public.current_company_id() and (public.can_manage_commercial() or public.can_manage_projects() or public.has_role(auth.uid(), 'auditor'::public.app_role)));
create policy "Authorized roles create visual analysis" on public.visual_analysis_sessions for insert to authenticated
with check (company_id = public.current_company_id() and purpose is not null and manufacturing_authority = false and (public.can_manage_commercial() or public.can_manage_projects()));
create policy "Authorized roles review visual analysis" on public.visual_analysis_sessions for update to authenticated
using (company_id = public.current_company_id() and (public.can_manage_commercial() or public.can_manage_projects()))
with check (company_id = public.current_company_id() and manufacturing_authority = false and (public.can_manage_commercial() or public.can_manage_projects()));

create policy "Authorized roles view visual findings" on public.visual_analysis_findings for select to authenticated
using (session_id in (select id from public.visual_analysis_sessions where company_id = public.current_company_id()));
create policy "Authorized roles manage visual findings" on public.visual_analysis_findings for all to authenticated
using (session_id in (select id from public.visual_analysis_sessions where company_id = public.current_company_id()) and (public.can_manage_commercial() or public.can_manage_projects()))
with check (session_id in (select id from public.visual_analysis_sessions where company_id = public.current_company_id()) and (public.can_manage_commercial() or public.can_manage_projects()));

create or replace function public.prepare_store_credit_purchase(
  _account_id uuid,
  _document_id uuid,
  _amount numeric,
  _idempotency_key uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_record public.store_credit_accounts%rowtype;
  document_record public.financial_documents%rowtype;
  transaction_id uuid;
begin
  if auth.uid() is null or not public.can_manage_commercial() then
    raise exception 'commercial_access_required';
  end if;
  if _amount is null or _amount <= 0 then raise exception 'amount_must_be_positive'; end if;

  select * into account_record from public.store_credit_accounts
  where id = _account_id and company_id = public.current_company_id();
  if not found then raise exception 'credit_account_not_found'; end if;

  select * into document_record from public.financial_documents
  where id = _document_id and company_id = public.current_company_id();
  if not found then raise exception 'financial_document_not_found'; end if;
  if document_record.supplier_id is distinct from account_record.supplier_id then
    raise exception 'document_supplier_mismatch';
  end if;
  if document_record.status <> 'review' then raise exception 'document_not_in_review'; end if;
  if document_record.total_amount is null
    or abs(document_record.total_amount - _amount) > 0.01 then
    raise exception 'document_amount_mismatch';
  end if;

  insert into public.store_credit_transactions (
    account_id, company_id, document_id, kind, amount,
    previous_balance, new_balance, status, idempotency_key, created_by
  ) values (
    account_record.id, account_record.company_id, document_record.id, 'purchase', _amount,
    account_record.current_balance, account_record.current_balance - _amount,
    'pending', _idempotency_key, auth.uid()
  )
  on conflict (company_id, idempotency_key) do update
  set idempotency_key = excluded.idempotency_key
  returning id into transaction_id;

  return transaction_id;
end;
$$;

create or replace function public.confirm_store_credit_transaction(_transaction_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  transaction_record public.store_credit_transactions%rowtype;
  account_record public.store_credit_accounts%rowtype;
  resulting_balance numeric(14,2);
begin
  if auth.uid() is null or not public.can_manage_commercial() then
    raise exception 'commercial_access_required';
  end if;

  select * into transaction_record
  from public.store_credit_transactions
  where id = _transaction_id and company_id = public.current_company_id()
  for update;
  if not found then raise exception 'credit_transaction_not_found'; end if;
  if transaction_record.status <> 'pending' then raise exception 'credit_transaction_not_pending'; end if;

  select * into account_record
  from public.store_credit_accounts
  where id = transaction_record.account_id and company_id = transaction_record.company_id
  for update;
  if not found then raise exception 'credit_account_not_found'; end if;

  if transaction_record.kind = 'purchase' then
    resulting_balance := account_record.current_balance - transaction_record.amount;
  else
    resulting_balance := account_record.current_balance + transaction_record.amount;
  end if;
  if resulting_balance < 0 then raise exception 'insufficient_store_credit'; end if;

  update public.store_credit_accounts
  set current_balance = resulting_balance, updated_at = now()
  where id = account_record.id;

  update public.store_credit_transactions
  set previous_balance = account_record.current_balance,
      new_balance = resulting_balance,
      status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = now()
  where id = transaction_record.id;

  if transaction_record.document_id is not null then
    update public.financial_documents
    set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
    where id = transaction_record.document_id;
  end if;

  return resulting_balance;
end;
$$;

create or replace function public.prevent_confirmed_credit_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.status = 'confirmed' then
    raise exception 'confirmed_credit_entries_are_append_only';
  end if;
  if tg_op = 'UPDATE' and old.status = 'confirmed' then
    raise exception 'confirmed_credit_entries_are_append_only';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists prevent_confirmed_credit_mutation_trigger on public.store_credit_transactions;
create trigger prevent_confirmed_credit_mutation_trigger
before update or delete on public.store_credit_transactions
for each row execute function public.prevent_confirmed_credit_mutation();

revoke all on function public.prepare_store_credit_purchase(uuid, uuid, numeric, uuid) from public, anon;
revoke all on function public.confirm_store_credit_transaction(uuid) from public, anon;
grant execute on function public.prepare_store_credit_purchase(uuid, uuid, numeric, uuid) to authenticated;
grant execute on function public.confirm_store_credit_transaction(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'commercial-documents',
  'commercial-documents',
  false,
  26214400,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/xml', 'application/xml']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Authorized roles read commercial documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'commercial-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (
    public.can_manage_commercial()
    or public.can_manage_projects()
    or public.has_role(auth.uid(), 'auditor'::public.app_role)
  )
);
create policy "Authorized roles upload commercial documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'commercial-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (public.can_manage_commercial() or public.can_manage_projects())
);
create policy "Authorized roles remove own pending commercial documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'commercial-documents'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (public.can_manage_commercial() or public.can_manage_projects())
);
