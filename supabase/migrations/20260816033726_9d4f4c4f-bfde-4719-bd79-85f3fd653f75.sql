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
drop trigger if exists enforce_project_initial_state_trigger on public.projects; create trigger enforce_project_initial_state_trigger before insert on public.projects for each row execute function public.enforce_operational_initial_state();
drop trigger if exists enforce_part_initial_state_trigger on public.parts; create trigger enforce_part_initial_state_trigger before insert on public.parts for each row execute function public.enforce_operational_initial_state();
drop trigger if exists enforce_module_initial_state_trigger on public.modules; create trigger enforce_module_initial_state_trigger before insert on public.modules for each row execute function public.enforce_operational_initial_state();

create or replace function public.enforce_project_status_gates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status_flow constant text[] := array[
    'novo', 'orcamento', 'corte', 'borda', 'usinagem', 'separacao',
    'conferencia', 'expedicao', 'montagem', 'concluido', 'assistencia'
  ];
  old_position integer;
  new_position integer;
  required_checks text[];
  missing_checks integer;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if auth.role() = 'service_role' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'escritorio'::public.app_role)
    or public.has_role(auth.uid(), 'fabrica'::public.app_role)
  ) then
    raise exception 'project_transition_forbidden';
  end if;

  old_position := array_position(status_flow, coalesce(old.status, 'novo'));
  new_position := array_position(status_flow, new.status);
  if old_position is null or new_position is null or new_position <> old_position + 1 then
    raise exception 'project_transition_must_be_sequential';
  end if;

  if new_position >= array_position(status_flow, 'usinagem')
    and new.status <> 'assistencia'
    and coalesce(new.machining_blocked, true) then
    raise exception 'project_machining_blocked';
  end if;

  required_checks := array[]::text[];
  if new_position >= array_position(status_flow, 'corte') and new.status <> 'assistencia' then
    required_checks := required_checks || array['xml_valido', 'lista_corte', 'nesting_dxf', 'materiais'];
  end if;
  if new_position >= array_position(status_flow, 'usinagem') and new.status <> 'assistencia' then
    required_checks := required_checks || array['documentacao_tecnica', 'cotas_furacao', 'bitolas', 'tags_skp'];
  end if;
  if new_position >= array_position(status_flow, 'montagem') and new.status <> 'assistencia' then
    required_checks := required_checks || array['usinagem_liberada', 'pecas_conferidas', 'ferragens_conferidas', 'grupos_completos'];
  end if;

  if cardinality(required_checks) > 0 then
    select count(*) into missing_checks
    from unnest(required_checks) required(check_type)
    where not exists (
      select 1 from public.validation_checks checks
      where checks.project_id = new.id
        and checks.check_type = required.check_type
        and checks.is_completed = true
    );
    if missing_checks > 0 then
      raise exception 'project_gate_incomplete';
    end if;
  end if;

  if new_position >= array_position(status_flow, 'usinagem')
    and new.status <> 'assistencia'
    and exists (
      select 1 from public.parts part
      where part.project_id = new.id
        and part.kind in ('peca', 'chapa')
        and coalesce(part.machining_blocked, true)
    ) then
    raise exception 'project_part_machining_blocked';
  end if;

  return new;
end;
$$;
drop trigger if exists enforce_project_status_gates_trigger on public.projects; create trigger enforce_project_status_gates_trigger before update of status on public.projects for each row execute function public.enforce_project_status_gates();

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
