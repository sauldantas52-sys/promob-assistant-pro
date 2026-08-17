-- 1. Atualizar RPC import_client_project
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
SET search_path = public
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
  IF auth.uid() IS NULL OR project_company_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'escritorio'::public.app_role)
    OR public.has_role(auth.uid(), 'projetista'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'project_import_forbidden';
  END IF;

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

  INSERT INTO public.projects (
    id, company_id, name, client_name, environment, notes, status, machining_blocked, is_validated, created_by
  ) VALUES (
    _project_id, project_company_id, trim(coalesce(_project->>'name', '')),
    NULLIF(trim(coalesce(_project->>'client_name', '')), ''),
    NULLIF(trim(coalesce(_project->>'environment', '')), ''),
    NULLIF(trim(coalesce(_project->>'notes', '')), ''),
    'novo', true, false, auth.uid()
  );

  FOR file_item IN SELECT value FROM jsonb_array_elements(coalesce(_files, '[]'::jsonb)) LOOP
    INSERT INTO public.project_files (
      project_id, file_name, file_type, size_bytes, summary, storage_path, storage_status
    ) VALUES (
      _project_id, file_item->>'file_name', file_item->>'file_type',
      (file_item->>'size_bytes')::bigint, file_item->'summary',
      file_item->>'storage_path', 'stored'
    );
  END LOOP;

  FOR module_item IN
    SELECT value, ordinality
    FROM jsonb_array_elements(coalesce(_modules, '[]'::jsonb)) WITH ORDINALITY
  LOOP
    INSERT INTO public.modules (
      project_id, company_id, name, environment, width_mm, height_mm, depth_mm, quantity, 
      id_xml, metadata, sequence
    ) VALUES (
      _project_id, project_company_id, module_item.value->>'name',
      COALESCE(NULLIF(module_item.value->>'environment', ''), NULLIF(_project->>'environment', '')),
      (module_item.value->>'width_mm')::numeric, (module_item.value->>'height_mm')::numeric,
      (module_item.value->>'depth_mm')::numeric, COALESCE((module_item.value->>'quantity')::integer, 1),
      module_item.value->>'id_xml', COALESCE(module_item.value->'metadata', '{}'::jsonb),
      module_item.ordinality
    ) RETURNING id INTO inserted_module_id;

    INSERT INTO public.assembly_groups (
      project_id, module_id, code, name, color, separation_status, conference_status, is_locked
    ) VALUES (
      _project_id, inserted_module_id, 'M' || LPAD(module_item.ordinality::text, 2, '0'),
      module_item.value->>'name', (ARRAY['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'])[((module_item.ordinality - 1) % 5) + 1],
      'pendente', 'pendente', true
    ) RETURNING id INTO inserted_group_id;

    FOR part_item IN SELECT value FROM jsonb_array_elements(COALESCE(module_item.value->'parts', '[]'::jsonb)) LOOP
      INSERT INTO public.parts (
        project_id, company_id, module_id, assembly_group_id, kind, name, material,
        thickness_mm, width_mm, length_mm, quantity, unit, edge_banding,
        id_xml, parent_id_xml, metadata, color, supplier,
        edge_top, edge_bottom, edge_left, edge_right,
        edge_name_general, edge_name_front, piece_code,
        module_sequence, piece_sequence, repetition, quantity_raw,
        machining_blocked, is_completed
      ) VALUES (
        _project_id, project_company_id, inserted_module_id, inserted_group_id,
        COALESCE(NULLIF(part_item->>'kind', ''), 'peca'), part_item->>'name', NULLIF(part_item->>'material', ''),
        (part_item->>'thickness_mm')::numeric, (part_item->>'width_mm')::numeric, (part_item->>'length_mm')::numeric,
        COALESCE((part_item->>'quantity')::numeric, 1), COALESCE(NULLIF(part_item->>'unit', ''), 'un'), NULLIF(part_item->>'edge_banding', ''),
        part_item->>'id_xml', part_item->>'parent_id_xml', COALESCE(part_item->'metadata', '{}'::jsonb),
        part_item->>'color', part_item->>'supplier',
        COALESCE((part_item->>'edge_top')::numeric, 0), COALESCE((part_item->>'edge_bottom')::numeric, 0),
        COALESCE((part_item->>'edge_left')::numeric, 0), COALESCE((part_item->>'edge_right')::numeric, 0),
        part_item->>'edge_name_general', part_item->>'edge_name_front', part_item->>'piece_code',
        module_item.ordinality, (part_item->>'piece_sequence')::integer,
        COALESCE((part_item->>'repetition')::integer, 1), (part_item->>'quantity_raw')::numeric,
        true, false
      );
    END LOOP;
  END LOOP;

  FOR part_item IN SELECT value FROM jsonb_array_elements(COALESCE(_loose_parts, '[]'::jsonb)) LOOP
    INSERT INTO public.parts (
      project_id, company_id, kind, name, material, thickness_mm, width_mm, length_mm,
      quantity, unit, edge_banding, id_xml, parent_id_xml, metadata, color, supplier,
      edge_top, edge_bottom, edge_left, edge_right, repetition, quantity_raw,
      machining_blocked, is_completed
    ) VALUES (
      _project_id, project_company_id, COALESCE(NULLIF(part_item->>'kind', ''), 'peca'),
      part_item->>'name', NULLIF(part_item->>'material', ''), (part_item->>'thickness_mm')::numeric,
      (part_item->>'width_mm')::numeric, (part_item->>'length_mm')::numeric,
      COALESCE((part_item->>'quantity')::numeric, 1), COALESCE(NULLIF(part_item->>'unit', ''), 'un'),
      NULLIF(part_item->>'edge_banding', ''), part_item->>'id_xml', part_item->>'parent_id_xml',
      COALESCE(part_item->'metadata', '{}'::jsonb), part_item->>'color', part_item->>'supplier',
      COALESCE((part_item->>'edge_top')::numeric, 0), COALESCE((part_item->>'edge_bottom')::numeric, 0),
      COALESCE((part_item->>'edge_left')::numeric, 0), COALESCE((part_item->>'edge_right')::numeric, 0),
      COALESCE((part_item->>'repetition')::integer, 1), (part_item->>'quantity_raw')::numeric,
      true, false
    );
  END LOOP;

  DELETE FROM public.project_import_sessions WHERE id = _project_id;
  RETURN _project_id;
END;
$$;

-- 2. Atualizar RPC ingest_and_distribute_project
CREATE OR REPLACE FUNCTION public.ingest_and_distribute_project(
    _project_id UUID,
    _modules JSONB,
    _loose_parts JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    module_record RECORD;
    part_record RECORD;
    new_module_id UUID;
    project_company_id UUID;
BEGIN
    SELECT company_id INTO project_company_id FROM public.projects WHERE id = _project_id;
    
    UPDATE public.projects 
    SET operational_status = 'processando', updated_at = now()
    WHERE id = _project_id;

    FOR module_record IN SELECT value, ordinality FROM jsonb_array_elements(_modules) WITH ORDINALITY
    LOOP
        INSERT INTO public.modules (
            project_id, company_id, name, environment, width_mm, height_mm, depth_mm, quantity, id_xml, metadata, sequence
        ) VALUES (
            _project_id, project_company_id, (module_record.value->>'name'), (module_record.value->>'environment'),
            (module_record.value->>'width_mm')::NUMERIC, (module_record.value->>'height_mm')::NUMERIC,
            (module_record.value->>'depth_mm')::NUMERIC, COALESCE((module_record.value->>'quantity')::INTEGER, 1),
            (module_record.value->>'id_xml'), COALESCE(module_record.value->'metadata', '{}'::jsonb),
            module_record.ordinality
        ) RETURNING id INTO new_module_id;

        FOR part_record IN SELECT value, ordinality FROM jsonb_array_elements(module_record.value->'parts') WITH ORDINALITY
        LOOP
            INSERT INTO public.parts (
                project_id, module_id, company_id, name, kind, material, thickness_mm, width_mm, length_mm,
                quantity, unit, edge_banding, id_xml, parent_id_xml, metadata, color, supplier,
                edge_top, edge_bottom, edge_left, edge_right, edge_name_general, edge_name_front,
                piece_code, module_sequence, piece_sequence, repetition, quantity_raw, machining_blocked
            ) VALUES (
                _project_id, new_module_id, project_company_id, (part_record.value->>'name'),
                COALESCE(NULLIF(part_record.value->>'kind', ''), 'peca')::public.part_kind,
                (part_record.value->>'material'), (part_record.value->>'thickness_mm')::NUMERIC,
                (part_record.value->>'width_mm')::NUMERIC, (part_record.value->>'length_mm')::NUMERIC,
                COALESCE((part_record.value->>'quantity')::NUMERIC, 1), COALESCE(part_record.value->>'unit', 'un'),
                (part_record.value->>'edge_banding'), (part_record.value->>'id_xml'), (part_record.value->>'parent_id_xml'),
                COALESCE(part_record.value->'metadata', '{}'::jsonb), (part_record.value->>'color'), (part_record.value->>'supplier'),
                COALESCE((part_record.value->>'edge_top')::NUMERIC, 0), COALESCE((part_record.value->>'edge_bottom')::NUMERIC, 0),
                COALESCE((part_record.value->>'edge_left')::NUMERIC, 0), COALESCE((part_record.value->>'edge_right')::NUMERIC, 0),
                (part_record.value->>'edge_name_general'), (part_record.value->>'edge_name_front'),
                (part_record.value->>'piece_code'), module_record.ordinality, part_record.ordinality,
                COALESCE((part_record.value->>'repetition')::INTEGER, 1), (part_record.value->>'quantity_raw')::NUMERIC,
                TRUE
            );
        END LOOP;
    END LOOP;

    INSERT INTO public.project_distribution (project_id, area, status, item_count)
    VALUES 
        (_project_id, 'engenharia', 'alimentado', jsonb_array_length(_modules)),
        (_project_id, 'corte', 'conferencia_pendente', (SELECT count(*) FROM public.parts WHERE project_id = _project_id)),
        (_project_id, 'borda', 'conferencia_pendente', (SELECT count(*) FROM public.parts WHERE project_id = _project_id AND (edge_top > 0 OR edge_bottom > 0 OR edge_left > 0 OR edge_right > 0))),
        (_project_id, 'usinagem', 'bloqueado', (SELECT count(*) FROM public.parts WHERE project_id = _project_id)),
        (_project_id, 'comercial', 'alimentado', 1);

    UPDATE public.projects SET operational_status = 'alimentado', updated_at = now() WHERE id = _project_id;
END;
$$;
