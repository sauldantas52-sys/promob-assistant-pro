-- Part 1.2: Core Commercial Tables
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_sites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_environments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_credit_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_credit_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outsourcing_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_outbox TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_analysis_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_analysis_findings TO authenticated;

GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.project_sites TO service_role;
GRANT ALL ON public.project_environments TO service_role;
GRANT ALL ON public.project_appointments TO service_role;
GRANT ALL ON public.suppliers TO service_role;
GRANT ALL ON public.store_credit_accounts TO service_role;
GRANT ALL ON public.financial_documents TO service_role;
GRANT ALL ON public.store_credit_transactions TO service_role;
GRANT ALL ON public.supplier_offers TO service_role;
GRANT ALL ON public.outsourcing_orders TO service_role;
GRANT ALL ON public.communication_outbox TO service_role;
GRANT ALL ON public.visual_analysis_sessions TO service_role;
GRANT ALL ON public.visual_analysis_findings TO service_role;
