
-- Atualização do RPC import_client_project para suportar metadados técnicos completos e fidelidade industrial
CREATE OR REPLACE FUNCTION public.import_client_project(
  _project_id uuid,
  _project jsonb,
  _files jsonb,
  _modules jsonb,
  _loose_parts jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET SEARCH_PATH = public
AS $$
DECLARE
  project_company_id uuid := public.current_company_id();
  module_item record;
  part_item jsonb;
  file_item jsonb;
  inserted_module_id uuid;
  inserted_group_id uuid;
  planned_file_count integer;
BEGIN
  -- 1. Verificações de Segurança e Integridade
  IF auth.uid() IS NULL OR project_company_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'escritorio'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'project_import_forbidden';
  END IF;

  IF jsonb_typeof(coalesce(_files, '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(coalesce(_modules, '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(coalesce(_loose_parts, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'project_import_payload_invalid';
  END IF;

  -- 2. Validar Sessão de Importação
  SELECT cardinality(session.planned_paths) INTO planned_file_count
  FROM public.project_import_sessions session
  WHERE session.id = _project_id
    AND session.company_id = project_company_id
    AND session.created_by = auth.uid()
    AND session.status = 'uploading'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_import_session_not_found';
  END IF;

  -- 3. Validar Manifesto de Arquivos
  IF jsonb_array_length(_files) <> planned_file_count THEN
    RAISE EXCEPTION 'project_file_manifest_incomplete';
  END IF;

  -- 4. Criar Projeto (Gate Industrial Fechado)
  INSERT INTO public.projects (
    id,
    company_id,
    name,
    client_name,
    environment,
    notes,
    status,
    machining_blocked,
    is_validated,
    created_by
  ) VALUES (
    _project_id,
    project_company_id,
    trim(coalesce(_project->>'name', '')),
    nullif(trim(coalesce(_project->>'client_name', '')), ''),
    nullif(trim(coalesce(_project->>'environment', '')), ''),
    nullif(trim(coalesce(_project->>'notes', '')), ''),
    'novo',
    true,
    false,
    auth.uid()
  );

  -- 5. Persistir Arquivos
  FOR file_item IN SELECT value FROM jsonb_array_elements(coalesce(_files, '[]'::jsonb)) LOOP
    INSERT INTO public.project_files (
      project_id,
      file_name,
      file_type,
      size_bytes,
      summary,
      storage_path,
      storage_status
    ) VALUES (
      _project_id,
      file_item->>'file_name',
      file_item->>'file_type',
      nullif(file_item->>'size_bytes', '')::bigint,
      file_item->'summary',
      file_item->>'storage_path',
      'stored'
    );
  END LOOP;

  -- 6. Processar Módulos
  FOR module_item IN
    SELECT value, ordinality
    FROM jsonb_array_elements(coalesce(_modules, '[]'::jsonb)) WITH ORDINALITY
  LOOP
    INSERT INTO public.modules (
      project_id,
      name,
      environment,
      width_mm,
      height_mm,
      depth_mm,
      quantity,
      data_source,
      metadata
    ) VALUES (
      _project_id,
      module_item.value->>'name',
      coalesce(nullif(module_item.value->>'environment', ''), nullif(_project->>'environment', '')),
      nullif(module_item.value->>'width_mm', '')::numeric,
      nullif(module_item.value->>'height_mm', '')::numeric,
      nullif(module_item.value->>'depth_mm', '')::numeric,
      coalesce(nullif(module_item.value->>'quantity', '')::integer, 1),
      'XML',
      jsonb_build_object('id_xml', module_item.value->>'id_xml')
    ) RETURNING id INTO inserted_module_id;

    INSERT INTO public.assembly_groups (
      project_id,
      module_id,
      code,
      name,
      color,
      separation_status,
      conference_status,
      is_locked
    ) VALUES (
      _project_id,
      inserted_module_id,
      'M' || lpad(module_item.ordinality::text, 2, '0'),
      module_item.value->>'name',
      (ARRAY['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'])[((module_item.ordinality - 1) % 5) + 1],
      'pendente',
      'pendente',
      true
    ) RETURNING id INTO inserted_group_id;

    FOR part_item IN
      SELECT value FROM jsonb_array_elements(coalesce(module_item.value->'parts', '[]'::jsonb))
    LOOP
      INSERT INTO public.parts (
        project_id,
        module_id,
        assembly_group_id,
        kind,
        name,
        material,
        thickness_mm,
        width_mm,
        length_mm,
        quantity,
        unit,
        edge_banding,
        data_source,
        machining_blocked,
        is_completed,
        metadata
      ) VALUES (
        _project_id,
        inserted_module_id,
        inserted_group_id,
        coalesce(nullif(part_item->>'kind', ''), 'peca'),
        part_item->>'name',
        nullif(part_item->>'material', ''),
        nullif(part_item->>'thickness_mm', '')::numeric,
        nullif(part_item->>'width_mm', '')::numeric,
        nullif(part_item->>'length_mm', '')::numeric,
        coalesce(nullif(part_item->>'quantity', '')::numeric, 1),
        coalesce(nullif(part_item->>'unit', ''), 'un'),
        nullif(part_item->>'edge_banding', ''),
        'XML',
        true,
        false,
        part_item->'metadata'
      );
    END LOOP;
  END LOOP;

  -- 7. Processar Peças Avulsas
  FOR part_item IN SELECT value FROM jsonb_array_elements(coalesce(_loose_parts, '[]'::jsonb)) LOOP
    INSERT INTO public.parts (
      project_id,
      kind,
      name,
      material,
      thickness_mm,
      width_mm,
      length_mm,
      quantity,
      unit,
      edge_banding,
      data_source,
      machining_blocked,
      is_completed,
      metadata
    ) VALUES (
      _project_id,
      coalesce(nullif(part_item->>'kind', ''), 'peca'),
      part_item->>'name',
      nullif(part_item->>'material', ''),
      nullif(part_item->>'thickness_mm', '')::numeric,
      nullif(part_item->>'width_mm', '')::numeric,
      nullif(part_item->>'length_mm', '')::numeric,
      coalesce(nullif(part_item->>'quantity', '')::numeric, 1),
      coalesce(nullif(part_item->>'unit', ''), 'un'),
      nullif(part_item->>'edge_banding', ''),
      'XML',
      true,
      false,
      part_item->'metadata'
    );
  END LOOP;

  DELETE FROM public.project_import_sessions WHERE id = _project_id;
  RETURN _project_id;
END;
$$;
