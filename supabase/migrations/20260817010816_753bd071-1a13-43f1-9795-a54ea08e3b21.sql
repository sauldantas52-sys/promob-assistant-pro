-- Migration para estabilização do fluxo industrial e correção de distribuição
-- 1. Garantir existência do enum de tipos de peças para evitar falhas de cast
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'part_kind') THEN
        CREATE TYPE public.part_kind AS ENUM ('peca', 'chapa', 'ferragem', 'acessorio', 'servico', 'outro');
    END IF;
END$$;

-- 2. Corrigir tabela de distribuição para permitir ingestão sem source_type explícito imediato
ALTER TABLE public.project_distribution 
ALTER COLUMN source_type SET DEFAULT 'xml',
ALTER COLUMN source_type DROP NOT NULL;

-- 3. Refatorar RPC de Ingestão e Distribuição para ser atômico e seguro
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
    -- Localizar a empresa do projeto
    SELECT company_id INTO v_company_id FROM public.projects WHERE id = _project_id;
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'project_not_found';
    END IF;

    -- Update project status to processando
    UPDATE public.projects 
    SET operational_status = 'processando',
        updated_at = now()
    WHERE id = _project_id;

    -- Limpeza de segurança (evitar duplicidade em re-importação parcial)
    DELETE FROM public.parts WHERE project_id = _project_id;
    DELETE FROM public.modules WHERE project_id = _project_id;
    DELETE FROM public.project_distribution WHERE project_id = _project_id;

    -- Process Modules
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
            quantity
        ) VALUES (
            _project_id,
            v_company_id,
            (module_record.value->>'name'),
            (module_record.value->>'environment'),
            (module_record.value->>'width_mm')::NUMERIC,
            (module_record.value->>'height_mm')::NUMERIC,
            (module_record.value->>'depth_mm')::NUMERIC,
            COALESCE((module_record.value->>'quantity')::INTEGER, 1)
        ) RETURNING id INTO new_module_id;

        -- Process Parts for this module
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
                data_source
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
                TRUE, -- Inicia bloqueado
                'XML'
            );
        END LOOP;
    END LOOP;

    -- Process Loose Parts
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
            data_source
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
            'XML'
        );
    END LOOP;

    -- Inserir Matriz de Distribuição Baseada nos Dados Reais Inseridos
    INSERT INTO public.project_distribution (project_id, area, status, item_count, source_type)
    VALUES 
        (_project_id, 'engenharia', 'alimentado', (SELECT count(*) FROM public.modules WHERE project_id = _project_id), 'xml'),
        (_project_id, 'corte', 'conferencia_pendente', (SELECT count(*) FROM public.parts WHERE project_id = _project_id AND kind IN ('peca', 'chapa')), 'xml'),
        (_project_id, 'borda', 'conferencia_pendente', (SELECT count(*) FROM public.parts WHERE project_id = _project_id AND edge_banding IS NOT NULL), 'xml'),
        (_project_id, 'usinagem', 'bloqueado', (SELECT count(*) FROM public.parts WHERE project_id = _project_id), 'xml'),
        (_project_id, 'comercial', 'alimentado', 1, 'xml');

    -- Finalizar com status alimentado
    UPDATE public.projects 
    SET operational_status = 'alimentado',
        updated_at = now()
    WHERE id = _project_id;
END;
$$;

-- 4. Garantir privilégios
GRANT EXECUTE ON FUNCTION public.ingest_and_distribute_project(uuid, jsonb, jsonb) TO authenticated;
GRANT ALL ON TABLE public.project_distribution TO authenticated;
