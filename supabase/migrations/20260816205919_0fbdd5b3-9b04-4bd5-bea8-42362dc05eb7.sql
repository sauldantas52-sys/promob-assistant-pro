-- Fix Public EXECUTE on SECURITY DEFINER functions created previously
revoke execute on function public.can_manage_commercial() from public, anon;
revoke execute on function public.can_manage_projects() from public, anon;
revoke execute on function public.create_complete_client_project(jsonb, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.import_legacy_store_credits(jsonb) from public, anon;

-- Ensure authenticated and service_role still have access
grant execute on function public.can_manage_commercial() to authenticated, service_role;
grant execute on function public.can_manage_projects() to authenticated, service_role;
grant execute on function public.create_complete_client_project(jsonb, jsonb, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.import_legacy_store_credits(jsonb) to authenticated, service_role;

-- Add RLS Policies for the new tables (missing in previous migration)
-- Clients
create policy "Users can view their company clients" on public.clients
for select to authenticated using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "Admins and Escritorio can manage clients" on public.clients
for all to authenticated using (public.can_manage_projects());

-- Project Sites
create policy "Users can view their company project sites" on public.project_sites
for select to authenticated using (project_id in (select id from public.projects where company_id = (select company_id from public.profiles where id = auth.uid())));

create policy "Admins and Escritorio can manage project sites" on public.project_sites
for all to authenticated using (public.can_manage_projects());

-- Suppliers
create policy "Users can view their company suppliers" on public.suppliers
for select to authenticated using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "Admins and Comercial can manage suppliers" on public.suppliers
for all to authenticated using (public.can_manage_commercial());

-- Store Credit Accounts
create policy "Users can view their company store credit accounts" on public.store_credit_accounts
for select to authenticated using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "Admins and Comercial can manage store credit accounts" on public.store_credit_accounts
for all to authenticated using (public.can_manage_commercial());
