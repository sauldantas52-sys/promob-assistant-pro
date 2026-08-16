-- Extend the existing fail-closed workflow to the dedicated project designer role.
do $migration$
declare
  definition text;
  updated_definition text;
begin
  select pg_get_functiondef('public.enforce_operational_initial_state()'::regprocedure)
  into definition;
  updated_definition := replace(
    definition,
    'or public.has_role(auth.uid(), ''escritorio''::public.app_role)',
    'or public.has_role(auth.uid(), ''escritorio''::public.app_role) or public.has_role(auth.uid(), ''projetista''::public.app_role)'
  );
  if updated_definition = definition then
    raise exception 'enforce_operational_initial_state_role_patch_failed';
  end if;
  execute updated_definition;

  select pg_get_functiondef('public.enforce_project_status_gates()'::regprocedure)
  into definition;
  updated_definition := replace(
    definition,
    'or public.has_role(auth.uid(), ''escritorio''::public.app_role)',
    'or public.has_role(auth.uid(), ''escritorio''::public.app_role) or public.has_role(auth.uid(), ''projetista''::public.app_role)'
  );
  if updated_definition = definition then
    raise exception 'enforce_project_status_gates_role_patch_failed';
  end if;
  execute updated_definition;

  select pg_get_functiondef(
    'public.import_client_project(uuid,jsonb,jsonb,jsonb,jsonb)'::regprocedure
  ) into definition;
  updated_definition := replace(
    definition,
    'or public.has_role(auth.uid(), ''escritorio''::public.app_role)',
    'or public.has_role(auth.uid(), ''escritorio''::public.app_role) or public.has_role(auth.uid(), ''projetista''::public.app_role)'
  );
  updated_definition := replace(
    updated_definition,
    '''M'' || lpad(module_item.ordinality::text, 2, ''0'')',
    '''G'' || module_item.ordinality::text'
  );
  if updated_definition = definition then
    raise exception 'import_client_project_patch_failed';
  end if;
  execute updated_definition;
end
$migration$;

drop policy if exists "Importers manage own project import sessions"
on public.project_import_sessions;
create policy "Importers manage own project import sessions"
on public.project_import_sessions for all to authenticated
using (
  created_by = auth.uid()
  and company_id = public.current_company_id()
  and public.can_manage_projects()
)
with check (
  created_by = auth.uid()
  and company_id = public.current_company_id()
  and public.can_manage_projects()
);

drop policy if exists "Technical roles can upload project artifacts" on storage.objects;
create policy "Technical roles can upload project artifacts"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_manage_projects()
  and exists (
    select 1 from public.project_import_sessions session
    where session.id::text = (storage.foldername(name))[2]
      and session.company_id = public.current_company_id()
      and session.created_by = auth.uid()
      and name = any(session.planned_paths)
  )
);

drop policy if exists "Technical roles can delete project artifacts" on storage.objects;
create policy "Technical roles can delete project artifacts"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_manage_projects()
  and exists (
    select 1 from public.project_import_sessions session
    where session.id::text = (storage.foldername(name))[2]
      and session.company_id = public.current_company_id()
      and session.created_by = auth.uid()
      and name = any(session.planned_paths)
  )
);
