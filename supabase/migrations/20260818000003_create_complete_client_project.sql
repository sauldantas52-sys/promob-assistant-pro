create or replace function public.create_complete_client_project(
  _client jsonb,
  _project jsonb,
  _site jsonb,
  _environments jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tenant_company_id uuid := public.current_company_id();
  selected_client_id uuid;
  created_project_id uuid;
  environment_item record;
begin
  if auth.uid() is null or tenant_company_id is null or not public.can_manage_projects() then
    raise exception 'project_create_forbidden';
  end if;
  if length(trim(coalesce(_project->>'name', ''))) < 2 then
    raise exception 'project_name_required';
  end if;
  if jsonb_typeof(coalesce(_environments, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(_environments, '[]'::jsonb)) = 0 then
    raise exception 'project_environment_required';
  end if;

  selected_client_id := nullif(_client->>'id', '')::uuid;
  if selected_client_id is not null then
    if not exists (
      select 1 from public.clients
      where id = selected_client_id and clients.company_id = tenant_company_id
    ) then
      raise exception 'client_not_found';
    end if;
  else
    if length(trim(coalesce(_client->>'name', ''))) < 2 then
      raise exception 'client_name_required';
    end if;
    insert into public.clients (company_id, name, phone, email, document, created_by)
    values (
      tenant_company_id,
      trim(_client->>'name'),
      nullif(trim(coalesce(_client->>'phone', '')), ''),
      nullif(trim(coalesce(_client->>'email', '')), ''),
      nullif(trim(coalesce(_client->>'document', '')), ''),
      auth.uid()
    ) returning id into selected_client_id;
  end if;

  insert into public.projects (
    company_id, client_id, client_name, name, environment,
    status, machining_blocked, is_validated
  )
  select
    tenant_company_id,
    selected_client_id,
    client.name,
    trim(_project->>'name'),
    (
      select string_agg(trim(value), ', ' order by ordinality)
      from jsonb_array_elements_text(_environments) with ordinality
    ),
    'novo',
    true,
    false
  from public.clients client
  where client.id = selected_client_id
  returning id into created_project_id;

  if length(trim(coalesce(_site->>'street', ''))) > 0 then
    insert into public.project_sites (
      project_id, postal_code, street, number, complement, district,
      city, state, reference, contact_name, contact_phone
    ) values (
      created_project_id,
      nullif(trim(coalesce(_site->>'postal_code', '')), ''),
      trim(_site->>'street'),
      trim(coalesce(_site->>'number', '')),
      nullif(trim(coalesce(_site->>'complement', '')), ''),
      nullif(trim(coalesce(_site->>'district', '')), ''),
      trim(coalesce(_site->>'city', '')),
      upper(trim(coalesce(_site->>'state', ''))),
      nullif(trim(coalesce(_site->>'reference', '')), ''),
      nullif(trim(coalesce(_site->>'contact_name', '')), ''),
      nullif(trim(coalesce(_site->>'contact_phone', '')), '')
    );
  end if;

  for environment_item in
    select trim(value) as name, ordinality
    from jsonb_array_elements_text(_environments) with ordinality
  loop
    if length(environment_item.name) < 2 then
      raise exception 'project_environment_invalid';
    end if;
    insert into public.project_environments (project_id, name, sequence)
    values (created_project_id, environment_item.name, environment_item.ordinality);
  end loop;

  return created_project_id;
end;
$$;

revoke all on function public.create_complete_client_project(jsonb, jsonb, jsonb, jsonb)
from public, anon;
grant execute on function public.create_complete_client_project(jsonb, jsonb, jsonb, jsonb)
to authenticated;
