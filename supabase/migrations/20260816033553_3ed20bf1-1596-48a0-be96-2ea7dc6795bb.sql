-- Part 1.3: Enable RLS and Policies for Commercial Tables
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

-- Canonical policies are created by 20260818000001 after the complete schema is available.
