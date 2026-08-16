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
