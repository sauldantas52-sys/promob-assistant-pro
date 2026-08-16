-- 1. Atualizar RPC import_client_project para remover obrigatoriedade de imagem
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
  -- Segurança e Identidade
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

  -- Validação de Payload
  IF jsonb_typeof(coalesce(_files, '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(coalesce(_modules, '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(coalesce(_loose_parts, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'project_import_payload_invalid';
  END IF;

  -- Verificar Sessão de Importação
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

  -- 2. Inserir Projeto
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
    NULLIF(trim(coalesce(_project->>'client_name', '')), ''),
    NULLIF(trim(coalesce(_project->>'environment', '')), ''),
    NULLIF(trim(coalesce(_project->>'notes', '')), ''),
    'novo',
    true,
    false,
    auth.uid()
  );

  -- 3. Inserir Arquivos Técnicos
  FOR file_item IN SELECT value FROM jsonb_array_elements(coalesce(_files, '[]'::jsonb)) LOOP
    -- Apenas arquivos que estão realmente no storage devem ser registrados
    IF EXISTS (
      SELECT 1 FROM storage.objects object
      WHERE object.bucket_id = 'project-files'
        AND object.name = file_item->>'storage_path'
    ) THEN
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
        (file_item->>'size_bytes')::bigint,
        file_item->'summary',
        file_item->>'storage_path',
        'stored'
      );
    END IF;
  END LOOP;

  -- 4. Inserir Módulos, Grupos e Peças
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
      data_source
    ) VALUES (
      _project_id,
      module_item.value->>'name',
      COALESCE(NULLIF(module_item.value->>'environment', ''), NULLIF(_project->>'environment', '')),
      (module_item.value->>'width_mm')::numeric,
      (module_item.value->>'height_mm')::numeric,
      (module_item.value->>'depth_mm')::numeric,
      COALESCE((module_item.value->>'quantity')::integer, 1),
      'XML'
    ) RETURNING id INTO inserted_module_id;

    -- Criar Grupo de Montagem Automático M01, M02...
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
      'M' || LPAD(module_item.ordinality::text, 2, '0'),
      module_item.value->>'name',
      (ARRAY['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'])[((module_item.ordinality - 1) % 5) + 1],
      'pendente',
      'pendente',
      true
    ) RETURNING id INTO inserted_group_id;

    -- Peças do Módulo
    FOR part_item IN
      SELECT value FROM jsonb_array_elements(COALESCE(module_item.value->'parts', '[]'::jsonb))
    LOOP
      INSERT INTO public.parts (
        project_id, module_id, assembly_group_id, kind, name, material,
        thickness_mm, width_mm, length_mm, quantity, unit, edge_banding,
        data_source, machining_blocked, is_completed, metadata
      ) VALUES (
        _project_id, inserted_module_id, inserted_group_id,
        COALESCE(NULLIF(part_item->>'kind', ''), 'peca'),
        part_item->>'name', NULLIF(part_item->>'material', ''),
        (part_item->>'thickness_mm')::numeric,
        (part_item->>'width_mm')::numeric,
        (part_item->>'length_mm')::numeric,
        COALESCE((part_item->>'quantity')::numeric, 1),
        COALESCE(NULLIF(part_item->>'unit', ''), 'un'),
        NULLIF(part_item->>'edge_banding', ''),
        'XML', true, false, part_item->'metadata'
      );
    END LOOP;
  END LOOP;

  -- 5. Inserir Peças Avulsas
  FOR part_item IN SELECT value FROM jsonb_array_elements(COALESCE(_loose_parts, '[]'::jsonb)) LOOP
    INSERT INTO public.parts (
      project_id, kind, name, material, thickness_mm, width_mm, length_mm,
      quantity, unit, edge_banding, data_source, machining_blocked, is_completed, metadata
    ) VALUES (
      _project_id,
      COALESCE(NULLIF(part_item->>'kind', ''), 'peca'),
      part_item->>'name', NULLIF(part_item->>'material', ''),
      (part_item->>'thickness_mm')::numeric,
      (part_item->>'width_mm')::numeric,
      (part_item->>'length_mm')::numeric,
      COALESCE((part_item->>'quantity')::numeric, 1),
      COALESCE(NULLIF(part_item->>'unit', ''), 'un'),
      NULLIF(part_item->>'edge_banding', ''),
      'XML', true, false, part_item->'metadata'
    );
  END LOOP;

  -- 6. Encerrar Sessão e Retornar
  DELETE FROM public.project_import_sessions WHERE id = _project_id;
  RETURN _project_id;
END;
$$;

-- 2. Corrigir RLS: Admin deve ver TUDO da empresa
-- PROJECTS
DROP POLICY IF EXISTS "Admins see all projects" ON public.projects;
CREATE POLICY "Admins see all projects" ON public.projects
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND company_id = public.current_company_id());

-- MODULES
DROP POLICY IF EXISTS "Admins see all modules" ON public.modules;
CREATE POLICY "Admins see all modules" ON public.modules
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND project_id IN (SELECT id FROM public.projects WHERE company_id = public.current_company_id()));

-- PARTS
DROP POLICY IF EXISTS "Admins see all parts" ON public.parts;
CREATE POLICY "Admins see all parts" ON public.parts
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND project_id IN (SELECT id FROM public.projects WHERE company_id = public.current_company_id()));

-- PROJECT_FILES
DROP POLICY IF EXISTS "Admins see all project files" ON public.project_files;
CREATE POLICY "Admins see all project files" ON public.project_files
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND project_id IN (SELECT id FROM public.projects WHERE company_id = public.current_company_id()));

-- ASSEMBLY_GROUPS
DROP POLICY IF EXISTS "Admins see all assembly groups" ON public.assembly_groups;
CREATE POLICY "Admins see all assembly groups" ON public.assembly_groups
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND project_id IN (SELECT id FROM public.projects WHERE company_id = public.current_company_id()));

-- VALIDATION_CHECKS
DROP POLICY IF EXISTS "Admins see all validation checks" ON public.validation_checks;
CREATE POLICY "Admins see all validation checks" ON public.validation_checks
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND project_id IN (SELECT id FROM public.projects WHERE company_id = public.current_company_id()));

-- Garantir que a função current_company_id() seja estável e segura
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;