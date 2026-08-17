-- Migration: Consolidação do Motor de Ingestão Industrial 4.0
-- Objetivo: Unificar versões e garantir persistência atômica e fiel.

-- Drop existing versions to avoid conflict
DROP FUNCTION IF EXISTS public.ingest_and_distribute_project(UUID, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.ingest_and_distribute_project(UUID, UUID, JSONB, JSONB);

-- Consolidated Function
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
    v_company_id UUID;
BEGIN
    -- 1. Auditoria de Empresa
    SELECT company_id INTO v_company_id FROM public.projects WHERE id = _project_id;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'project_not_found';
    END IF;

    -- 2. Status Inicial de Processamento
    UPDATE public.projects 
    SET operational_status = 'processando',
        updated_at = now()
    WHERE id = _project_id;

    -- 3. Limpeza Atômica (Garantir idempotência na importação)
    DELETE FROM public.project_distribution WHERE project_id = _project_id;
    DELETE FROM public.parts WHERE project_id = _project_id;
    DELETE FROM public.assembly_groups WHERE project_id = _project_id;
    DELETE FROM public.modules WHERE project_id = _project_id;

    -- 4. Ingestão de Módulos
    FOR module_record IN SELECT * FROM jsonb_array_elements(COALESCE(_modules, '[]'::jsonb))
    LOOP
        INSERT INTO public.modules (
            project_id,
            company_id,
            name,
            environment,
            width_mm,
            height_mm,
            depth_mm,
            quantity,
            data_source
        ) VALUES (
            _project_id,
            v_company_id,
            (module_record.value->>'name'),
            (module_record.value->>'environment'),
            (module_record.value->>'width_mm')::NUMERIC,
            (module_record.value->>'height_mm')::NUMERIC,
            (module_record.value->>'depth_mm')::NUMERIC,
            COALESCE((module_record.value->>'quantity')::INTEGER, 1),
            'XML_IMPORT'
        ) RETURNING id INTO new_module_id;

        -- 5. Ingestão de Peças do Módulo
        FOR part_record IN SELECT * FROM jsonb_array_elements(module_record.value->'parts')
        LOOP
            INSERT INTO public.parts (
                project_id,
                module_id,
                company_id,
                name,
                kind,
                material,
                thickness_mm,
                width_mm,
                length_mm,
                quantity,
                unit,
                edge_banding,
                metadata,
                machining_blocked,
                data_source,
                is_completed
            ) VALUES (
                _project_id,
                new_module_id,
                v_company_id,
                (part_record.value->>'name'),
                (COALESCE(part_record.value->>'kind', 'peca'))::public.part_kind,
                (part_record.value->>'material'),
                (part_record.value->>'thickness_mm')::NUMERIC,
                (part_record.value->>'width_mm')::NUMERIC,
                (part_record.value->>'length_mm')::NUMERIC,
                COALESCE((part_record.value->>'quantity')::NUMERIC, 1),
                COALESCE(part_record.value->>'unit', 'un'),
                (part_record.value->>'edge_banding'),
                COALESCE(part_record.value->'metadata', '{}'::jsonb),
                TRUE, -- Segurança: Inicia bloqueado para usinagem
                'XML_IMPORT',
                FALSE
            );
        END LOOP;
    END LOOP;

    -- 6. Ingestão de Peças Avulsas (Loose Parts)
    FOR part_record IN SELECT * FROM jsonb_array_elements(COALESCE(_loose_parts, '[]'::jsonb))
    LOOP
        INSERT INTO public.parts (
            project_id,
            company_id,
            name,
            kind,
            material,
            thickness_mm,
            width_mm,
            length_mm,
            quantity,
            unit,
            edge_banding,
            metadata,
            machining_blocked,
            data_source,
            is_completed
        ) VALUES (
            _project_id,
            v_company_id,
            (part_record.value->>'name'),
            (COALESCE(part_record.value->>'kind', 'peca'))::public.part_kind,
            (part_record.value->>'material'),
            (part_record.value->>'thickness_mm')::NUMERIC,
            (part_record.value->>'width_mm')::NUMERIC,
            (part_record.value->>'length_mm')::NUMERIC,
            COALESCE((part_record.value->>'quantity')::NUMERIC, 1),
            COALESCE(part_record.value->>'unit', 'un'),
            (part_record.value->>'edge_banding'),
            COALESCE(part_record.value->'metadata', '{}'::jsonb),
            TRUE,
            'XML_IMPORT',
            FALSE
        );
    END LOOP;

    -- 7. Distribuição Automática (Matriz Industrial)
    INSERT INTO public.project_distribution (project_id, area, status, item_count, metadata)
    VALUES 
        (_project_id, 'engenharia', 'alimentado', (SELECT count(*) FROM public.modules WHERE project_id = _project_id), '{"source": "xml"}'::jsonb),
        (_project_id, 'corte', 'conferencia_pendente', (SELECT count(*) FROM public.parts WHERE project_id = _project_id AND kind = 'peca'), '{"source": "xml"}'::jsonb),
        (_project_id, 'borda', 'conferencia_pendente', (SELECT count(*) FROM public.parts WHERE project_id = _project_id AND edge_banding IS NOT NULL), '{"source": "xml"}'::jsonb),
        (_project_id, 'usinagem', 'bloqueado', (SELECT count(*) FROM public.parts WHERE project_id = _project_id), '{"source": "xml"}'::jsonb),
        (_project_id, 'comercial', 'alimentado', 1, '{"source": "xml"}'::jsonb);

    -- 8. Finalização do Status Operacional
    UPDATE public.projects 
    SET operational_status = 'alimentado',
        updated_at = now()
    WHERE id = _project_id;
END;
$$;

-- Saneamento: Marcar projetos de teste existentes
UPDATE public.projects SET is_test = true WHERE name ILIKE '%amanda%' OR name ILIKE '%teste%';

-- Limpeza: Remover projetos fantasmas (sem peças) que não sejam manuais
DELETE FROM public.projects 
WHERE id NOT IN (SELECT project_id FROM public.parts) 
AND status = 'novo' 
AND is_test = false;
