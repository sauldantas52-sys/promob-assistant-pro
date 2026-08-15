-- Tenant bootstrap must be atomic and cannot accept a client-selected role.
revoke insert on public.companies from authenticated;
revoke insert on public.profiles from authenticated;
revoke insert on public.user_roles from authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy if exists "Authenticated can create company" on public.companies;
drop policy if exists "Enable insert for authenticated users during setup" on public.companies;
drop policy if exists "Users can create own profile" on public.profiles;
drop policy if exists "Enable insert for users to own profile" on public.profiles;
drop policy if exists "Users can claim first role" on public.user_roles;
drop policy if exists "Enable insert for users to own roles" on public.user_roles;
drop policy if exists "Enable select for all authenticated users" on public.companies;

create or replace function public.bootstrap_company(
  _company_name text,
  _full_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  existing_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if length(trim(coalesce(_company_name, ''))) < 2 then
    raise exception 'company_name_required';
  end if;
  if length(trim(coalesce(_full_name, ''))) < 2 then
    raise exception 'full_name_required';
  end if;

  select company_id into existing_company_id
  from public.profiles
  where id = auth.uid()
  for update;

  if existing_company_id is not null
    or exists (select 1 from public.user_roles where user_id = auth.uid()) then
    raise exception 'account_already_bootstrapped';
  end if;

  insert into public.companies (name)
  values (trim(_company_name))
  returning id into new_company_id;

  insert into public.profiles (id, company_id, full_name)
  values (auth.uid(), new_company_id, trim(_full_name))
  on conflict (id) do update
  set company_id = excluded.company_id,
      full_name = excluded.full_name;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), 'admin'::public.app_role);

  return new_company_id;
end;
$$;

revoke all on function public.bootstrap_company(text, text) from public, anon;
grant execute on function public.bootstrap_company(text, text) to authenticated;

-- New operational records always begin fail-closed.
alter table public.parts add column if not exists storage_location text;
alter table public.projects add column if not exists assembly_photos jsonb default '[]'::jsonb;
alter table public.projects add column if not exists assembly_notes text;

create or replace function public.enforce_operational_initial_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    if auth.role() = 'service_role' then
      return new;
    end if;
    raise exception 'authentication_required';
  end if;

  if tg_table_name = 'projects' then
    if not (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'escritorio'::public.app_role)
    ) then
      raise exception 'project_create_forbidden';
    end if;
    if new.status is distinct from 'novo'
      or new.machining_blocked is distinct from true
      or new.is_validated is distinct from false then
      raise exception 'project_initial_state_invalid';
    end if;
  elsif tg_table_name = 'parts' then
    if not (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'escritorio'::public.app_role)
    ) then
      raise exception 'part_create_forbidden';
    end if;
    if new.machining_blocked is distinct from true
      or coalesce(new.is_completed, false) then
      raise exception 'part_initial_state_invalid';
    end if;
  elsif tg_table_name = 'modules' then
    if not (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'escritorio'::public.app_role)
    ) then
      raise exception 'module_create_forbidden';
    end if;
    if coalesce(new.is_completed, false) then
      raise exception 'module_initial_state_invalid';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_project_initial_state_trigger on public.projects;
create trigger enforce_project_initial_state_trigger
before insert on public.projects
for each row execute function public.enforce_operational_initial_state();

drop trigger if exists enforce_part_initial_state_trigger on public.parts;
create trigger enforce_part_initial_state_trigger
before insert on public.parts
for each row execute function public.enforce_operational_initial_state();

drop trigger if exists enforce_module_initial_state_trigger on public.modules;
create trigger enforce_module_initial_state_trigger
before insert on public.modules
for each row execute function public.enforce_operational_initial_state();

-- Maintenance requests cannot start at a terminal state or forge timestamps.
create or replace function public.validate_maintenance_request_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    if auth.role() = 'service_role' then
      return new;
    end if;
    raise exception 'authentication_required';
  end if;

  if new.company_id <> public.current_company_id() then
    raise exception 'maintenance_company_mismatch';
  end if;
  if not exists (
    select 1 from public.projects project
    where project.id = new.project_id and project.company_id = new.company_id
  ) then
    raise exception 'maintenance_project_mismatch';
  end if;
  if new.module_id is not null and not exists (
    select 1 from public.modules module
    where module.id = new.module_id and module.project_id = new.project_id
  ) then
    raise exception 'maintenance_module_mismatch';
  end if;
  if new.part_id is not null and not exists (
    select 1 from public.parts part
    where part.id = new.part_id
      and part.project_id = new.project_id
      and (new.module_id is null or part.module_id = new.module_id)
  ) then
    raise exception 'maintenance_part_mismatch';
  end if;

  if tg_op = 'INSERT' then
    if not (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'escritorio'::public.app_role)
      or public.has_role(auth.uid(), 'montador'::public.app_role)
    ) then
      raise exception 'maintenance_create_forbidden';
    end if;
    if new.created_by <> auth.uid() or new.status::text <> 'aberto' then
      raise exception 'maintenance_initial_state_invalid';
    end if;
    new.created_at := now();
  elsif new.id is distinct from old.id
    or new.company_id is distinct from old.company_id
    or new.project_id is distinct from old.project_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'maintenance_identity_immutable';
  end if;
  return new;
end;
$$;

-- Gate 1, rather than an arbitrary number of checks, defines validation.
create or replace function public.check_project_validation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gate_complete boolean;
begin
  select not exists (
    select 1
    from unnest(array['xml_valido', 'lista_corte', 'nesting_dxf', 'materiais']) required(check_type)
    where not exists (
      select 1 from public.validation_checks checks
      where checks.project_id = new.project_id
        and checks.check_type = required.check_type
        and checks.is_completed = true
    )
  ) into gate_complete;

  update public.projects
  set is_validated = gate_complete,
      validated_at = case when gate_complete then now() else null end,
      validated_by = case when gate_complete then auth.uid() else null end
  where id = new.project_id;
  return new;
end;
$$;

-- Assembly groups are tenant-scoped and operational writes are role-scoped.
drop policy if exists "Users can manage assembly groups" on public.assembly_groups;
drop policy if exists "Users can access assembly groups of their company projects" on public.assembly_groups;
create policy "Company users can view assembly groups"
on public.assembly_groups for select to authenticated
using (
  exists (
    select 1 from public.projects project
    where project.id = assembly_groups.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "Technical roles can create assembly groups"
on public.assembly_groups for insert to authenticated
with check (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role))
  and exists (
    select 1 from public.projects project
    where project.id = assembly_groups.project_id
      and project.company_id = public.current_company_id()
  )
  and (
    assembly_groups.module_id is null
    or exists (
      select 1 from public.modules module
      where module.id = assembly_groups.module_id
        and module.project_id = assembly_groups.project_id
    )
  )
);
create policy "Assembly roles can update assembly groups"
on public.assembly_groups for update to authenticated
using (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'montador'::public.app_role))
  and exists (
    select 1 from public.projects project
    where project.id = assembly_groups.project_id
      and project.company_id = public.current_company_id()
  )
  and (
    assembly_groups.module_id is null
    or exists (
      select 1 from public.modules module
      where module.id = assembly_groups.module_id
        and module.project_id = assembly_groups.project_id
    )
  )
)
with check (
  (public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'montador'::public.app_role))
  and exists (
    select 1 from public.projects project
    where project.id = assembly_groups.project_id
      and project.company_id = public.current_company_id()
  )
  and (
    assembly_groups.module_id is null
    or exists (
      select 1 from public.modules module
      where module.id = assembly_groups.module_id
        and module.project_id = assembly_groups.project_id
    )
  )
);

-- Shipping evidence is immutable outside its controlled status workflow.
revoke delete on public.shipping_volumes from authenticated;
create or replace function public.enforce_shipping_volume_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_status text;
begin
  if auth.uid() is null then
    if auth.role() = 'service_role' then
      return new;
    end if;
    raise exception 'authentication_required';
  end if;
  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'fabrica'::public.app_role)
  ) then
    raise exception 'shipping_change_forbidden';
  end if;
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.project_id is distinct from old.project_id
    or new.group_id is distinct from old.group_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'shipping_identity_immutable';
  end if;
  if new.group_id is not null and not exists (
    select 1 from public.assembly_groups assembly_group
    where assembly_group.id = new.group_id
      and assembly_group.project_id = new.project_id
  ) then
    raise exception 'shipping_group_mismatch';
  end if;

  select project.status into project_status
  from public.projects project
  where project.id = new.project_id
    and project.company_id = public.current_company_id();
  if project_status is distinct from 'expedicao' then
    raise exception 'shipping_project_stage_invalid';
  end if;
  if tg_op = 'INSERT' and new.status::text <> 'aguardando' then
    raise exception 'shipping_initial_status_invalid';
  end if;
  if tg_op = 'UPDATE'
    and new.status is distinct from old.status
    and new.status::text <> 'bloqueado'
    and new.status::text is distinct from (case old.status::text
      when 'aguardando' then 'conferido'
      when 'conferido' then 'carregado'
      when 'carregado' then 'entregue'
      else null
    end) then
    raise exception 'shipping_transition_must_be_sequential';
  end if;
  return new;
end;
$$;

-- Private project artifacts use a tenant/project path and persist their object key.
alter table public.project_files
add column if not exists storage_path text,
add column if not exists storage_status text not null default 'legacy_metadata';

create table if not exists public.project_import_sessions (
  id uuid primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  planned_paths text[] not null,
  status text not null default 'uploading' check (status in ('uploading', 'cleanup_required')),
  created_at timestamptz not null default now()
);
alter table public.project_import_sessions enable row level security;
grant select, insert, update, delete on public.project_import_sessions to authenticated;
create or replace function public.validate_project_import_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  path_count integer;
  distinct_path_count integer;
  paths_scoped boolean;
begin
  if auth.uid() is null
    or new.created_by <> auth.uid()
    or new.company_id <> public.current_company_id()
    or new.status <> 'uploading' then
    raise exception 'project_import_session_invalid';
  end if;
  select count(*), count(distinct path), bool_and(
    path like new.company_id::text || '/' || new.id::text || '/%'
  )
  into path_count, distinct_path_count, paths_scoped
  from unnest(new.planned_paths) path;
  if path_count < 7 or path_count > 8
    or distinct_path_count <> path_count
    or not coalesce(paths_scoped, false) then
    raise exception 'project_import_paths_invalid';
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists validate_project_import_session_trigger on public.project_import_sessions;
create trigger validate_project_import_session_trigger
before insert on public.project_import_sessions
for each row execute function public.validate_project_import_session();

create policy "Importers manage own project import sessions"
on public.project_import_sessions for all to authenticated
using (
  created_by = auth.uid()
  and company_id = public.current_company_id()
  and (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
  )
)
with check (
  created_by = auth.uid()
  and company_id = public.current_company_id()
  and (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
  )
);
revoke update, delete on public.project_import_sessions from authenticated;

create or replace function public.mark_import_cleanup_required(_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_import_sessions
  set status = 'cleanup_required'
  where id = _session_id
    and company_id = public.current_company_id()
    and created_by = auth.uid();
end;
$$;

create or replace function public.discard_import_session(_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  session_paths text[];
begin
  select planned_paths into session_paths
  from public.project_import_sessions
  where id = _session_id
    and company_id = public.current_company_id()
    and created_by = auth.uid()
  for update;
  if not found then
    return;
  end if;
  if exists (
    select 1 from storage.objects object
    where object.bucket_id = 'project-files'
      and object.name = any(session_paths)
  ) then
    raise exception 'import_session_still_has_objects';
  end if;
  delete from public.project_import_sessions where id = _session_id;
end;
$$;

revoke all on function public.mark_import_cleanup_required(uuid) from public, anon;
revoke all on function public.discard_import_session(uuid) from public, anon;
grant execute on function public.mark_import_cleanup_required(uuid) to authenticated;
grant execute on function public.discard_import_session(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  52428800,
  array[
    'application/xml',
    'text/xml',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/dxf',
    'image/vnd.dxf',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Company users can read project artifacts" on storage.objects;
create policy "Company users can read project artifacts"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and exists (
    select 1 from public.projects project
    where project.id::text = (storage.foldername(name))[2]
      and project.company_id = public.current_company_id()
  )
);

drop policy if exists "Technical roles can upload project artifacts" on storage.objects;
create policy "Technical roles can upload project artifacts"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
  )
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
  and (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
  )
  and exists (
    select 1 from public.project_import_sessions session
    where session.id::text = (storage.foldername(name))[2]
      and session.company_id = public.current_company_id()
      and session.created_by = auth.uid()
      and name = any(session.planned_paths)
  )
);

create or replace function public.import_client_project(
  _project_id uuid,
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
  module_item record;
  part_item jsonb;
  file_item jsonb;
  inserted_module_id uuid;
  inserted_group_id uuid;
  planned_file_count integer;
begin
  if auth.uid() is null or project_company_id is null then
    raise exception 'authentication_required';
  end if;
  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
  ) then
    raise exception 'project_import_forbidden';
  end if;
  if jsonb_typeof(coalesce(_files, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(_modules, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(_loose_parts, '[]'::jsonb)) <> 'array' then
    raise exception 'project_import_payload_invalid';
  end if;
  select cardinality(session.planned_paths) into planned_file_count
  from public.project_import_sessions session
    where session.id = _project_id
      and session.company_id = project_company_id
      and session.created_by = auth.uid()
      and session.status = 'uploading'
  for update;
  if not found then
    raise exception 'project_import_session_not_found';
  end if;
  if jsonb_array_length(_files) <> planned_file_count
    or exists (
      select 1
      from unnest((
        select session.planned_paths
        from public.project_import_sessions session
        where session.id = _project_id
      )) planned(path)
      where not exists (
        select 1 from jsonb_array_elements(_files) submitted(file)
        where submitted.file->>'storage_path' = planned.path
      )
    ) then
    raise exception 'project_file_manifest_incomplete';
  end if;
  if exists (
    select 1
    from unnest(array[
      'xml', 'cotas_pdf', 'lista_compra_pdf', 'lista_corte_pdf',
      'preview_corte_pdf', 'imagem_referencia', 'dxf_conferencia'
    ]) required(file_type)
    where not exists (
      select 1 from jsonb_array_elements(_files) submitted(file)
      where submitted.file->>'file_type' = required.file_type
    )
  ) then
    raise exception 'project_required_file_missing';
  end if;

  insert into public.projects (
    id,
    company_id,
    name,
    client_name,
    environment,
    notes,
    status,
    machining_blocked,
    is_validated
  ) values (
    _project_id,
    project_company_id,
    trim(coalesce(_project->>'name', '')),
    nullif(trim(coalesce(_project->>'client_name', '')), ''),
    nullif(trim(coalesce(_project->>'environment', '')), ''),
    nullif(trim(coalesce(_project->>'notes', '')), ''),
    'novo',
    true,
    false
  );

  for file_item in select value from jsonb_array_elements(coalesce(_files, '[]'::jsonb)) loop
    if file_item->>'storage_path' not like project_company_id::text || '/' || _project_id::text || '/%'
      or not exists (
        select 1 from public.project_import_sessions session
        where session.id = _project_id
          and file_item->>'storage_path' = any(session.planned_paths)
      )
      or not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'project-files'
          and object.name = file_item->>'storage_path'
      ) then
      raise exception 'project_file_path_invalid';
    end if;
    insert into public.project_files (
      project_id,
      file_name,
      file_type,
      size_bytes,
      summary,
      storage_path,
      storage_status
    ) values (
      _project_id,
      file_item->>'file_name',
      file_item->>'file_type',
      nullif(file_item->>'size_bytes', '')::bigint,
      file_item->'summary',
      file_item->>'storage_path',
      'stored'
    );
  end loop;

  for module_item in
    select value, ordinality
    from jsonb_array_elements(coalesce(_modules, '[]'::jsonb)) with ordinality
  loop
    insert into public.modules (
      project_id,
      name,
      environment,
      width_mm,
      height_mm,
      depth_mm,
      quantity,
      data_source
    ) values (
      _project_id,
      module_item.value->>'name',
      coalesce(nullif(module_item.value->>'environment', ''), nullif(_project->>'environment', '')),
      nullif(module_item.value->>'width_mm', '')::numeric,
      nullif(module_item.value->>'height_mm', '')::numeric,
      nullif(module_item.value->>'depth_mm', '')::numeric,
      coalesce(nullif(module_item.value->>'quantity', '')::integer, 1),
      'XML'
    ) returning id into inserted_module_id;

    insert into public.assembly_groups (
      project_id,
      module_id,
      code,
      name,
      color,
      separation_status,
      conference_status,
      is_locked
    ) values (
      _project_id,
      inserted_module_id,
      'M' || lpad(module_item.ordinality::text, 2, '0'),
      module_item.value->>'name',
      (array['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'])[((module_item.ordinality - 1) % 5) + 1],
      'pendente',
      'pendente',
      true
    ) returning id into inserted_group_id;

    for part_item in
      select value from jsonb_array_elements(coalesce(module_item.value->'parts', '[]'::jsonb))
    loop
      insert into public.parts (
        project_id, module_id, assembly_group_id, kind, name, material,
        thickness_mm, width_mm, length_mm, quantity, unit, edge_banding,
        data_source, machining_blocked, is_completed
      ) values (
        _project_id, inserted_module_id, inserted_group_id,
        coalesce(nullif(part_item->>'kind', ''), 'peca'),
        part_item->>'name', nullif(part_item->>'material', ''),
        nullif(part_item->>'thickness_mm', '')::numeric,
        nullif(part_item->>'width_mm', '')::numeric,
        nullif(part_item->>'length_mm', '')::numeric,
        coalesce(nullif(part_item->>'quantity', '')::numeric, 1),
        coalesce(nullif(part_item->>'unit', ''), 'un'),
        nullif(part_item->>'edge_banding', ''),
        'XML', true, false
      );
    end loop;
  end loop;

  for part_item in select value from jsonb_array_elements(coalesce(_loose_parts, '[]'::jsonb)) loop
    insert into public.parts (
      project_id, kind, name, material, thickness_mm, width_mm, length_mm,
      quantity, unit, edge_banding, data_source, machining_blocked, is_completed
    ) values (
      _project_id,
      coalesce(nullif(part_item->>'kind', ''), 'peca'),
      part_item->>'name', nullif(part_item->>'material', ''),
      nullif(part_item->>'thickness_mm', '')::numeric,
      nullif(part_item->>'width_mm', '')::numeric,
      nullif(part_item->>'length_mm', '')::numeric,
      coalesce(nullif(part_item->>'quantity', '')::numeric, 1),
      coalesce(nullif(part_item->>'unit', ''), 'un'),
      nullif(part_item->>'edge_banding', ''),
      'XML', true, false
    );
  end loop;

  delete from public.project_import_sessions where id = _project_id;
  return _project_id;
end;
$$;

revoke all on function public.import_client_project(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.import_client_project(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Deletion through the broad legacy table grant would orphan private artifacts.
revoke delete on public.projects from authenticated;
revoke insert, update, delete on public.project_files from authenticated;

-- Legacy maintenance photos must not remain globally readable or publicly served.
update storage.buckets
set public = false
where id = 'maintenance_photos';

drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "Authenticated users can view photos" on storage.objects;
drop policy if exists "Authenticated users can update their photos" on storage.objects;
drop policy if exists "Authenticated users can delete their photos" on storage.objects;

create policy "Company users can view maintenance photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'maintenance_photos'
  and exists (
    select 1 from public.projects project
    where project.id::text = (storage.foldername(name))[1]
      and project.company_id = public.current_company_id()
  )
);
