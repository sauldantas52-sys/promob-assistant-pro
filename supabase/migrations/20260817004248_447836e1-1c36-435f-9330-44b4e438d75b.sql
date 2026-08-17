-- Ingestão Industrial e Arquitetura de Fluxo 4.0
-- Este script define a infraestrutura para separação entre Ingestão, Distribuição, Conferência e Liberação.

-- 1. Ampliar estados do projeto
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_operational_status') THEN
        CREATE TYPE public.project_operational_status AS ENUM (
            'recebido',
            'processando',
            'alimentado',
            'conferencia_pendente',
            'divergencia_encontrada',
            'pronto_para_producao',
            'em_producao',
            'finalizado'
        );
    END IF;
END $$;

-- 2. Adicionar campos de controle de fluxo na tabela projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS operational_status public.project_operational_status DEFAULT 'recebido',
ADD COLUMN IF NOT EXISTS ingestion_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS distribution_completed_at TIMESTAMPTZ;

-- 3. Criar tabela de distribuição para rastreabilidade de fontes
CREATE TABLE IF NOT EXISTS public.project_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    area TEXT NOT NULL, -- 'comercial', 'compras', 'engenharia', 'corte', 'borda', 'usinagem', 'separacao', 'montagem', 'expedicao', 'assistencia'
    source_type TEXT NOT NULL, -- 'xml', 'dxf', 'pdf_corte', etc
    source_file_id UUID REFERENCES public.project_files(id),
    status TEXT DEFAULT 'recebido', -- 'recebido', 'alimentado', 'pendente', 'bloqueado', 'liberado'
    item_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, area)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_distribution TO authenticated;
GRANT ALL ON public.project_distribution TO service_role;
ALTER TABLE public.project_distribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company distribution"
ON public.project_distribution FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_distribution.project_id 
    AND p.company_id = public.current_company_id()
));

-- 4. RPC para Ingestão e Distribuição Industrial (Fail-Closed para Integridade, Aberto para Gates)
CREATE OR REPLACE FUNCTION public.ingest_and_distribute_project(
    _project_id UUID,
    _company_id UUID,
    _modules JSONB,
    _loose_parts JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    module_item JSONB;
    part_item JSONB;
    created_module_id UUID;
    total_parts INTEGER := 0;
    xml_file_id UUID;
    dxf_file_id UUID;
    listacorte_file_id UUID;
    listacompra_file_id UUID;
    cotas_file_id UUID;
BEGIN
    -- 1. Ingestão: Persistir Estrutura Técnica
    -- Módulos e Peças
    FOR module_item IN SELECT * FROM jsonb_array_elements(_modules)
    LOOP
        INSERT INTO public.modules (
            project_id, name, environment, width_mm, height_mm, depth_mm, quantity, data_source
        ) VALUES (
            _project_id,
            module_item->>'name',
            module_item->>'environment',
            (module_item->>'width_mm')::NUMERIC,
            (module_item->>'height_mm')::NUMERIC,
            (module_item->>'depth_mm')::NUMERIC,
            (module_item->>'quantity')::INTEGER,
            'xml_promob'
        ) RETURNING id INTO created_module_id;

        FOR part_item IN SELECT * FROM jsonb_array_elements(module_item->'parts')
        LOOP
            INSERT INTO public.parts (
                project_id, module_id, name, kind, material, thickness_mm, width_mm, length_mm, 
                quantity, unit, edge_banding, metadata, data_source, machining_blocked
            ) VALUES (
                _project_id,
                created_module_id,
                part_item->>'name',
                part_item->>'kind',
                part_item->>'material',
                (part_item->>'thickness_mm')::NUMERIC,
                (part_item->>'width_mm')::NUMERIC,
                (part_item->>'length_mm')::NUMERIC,
                (part_item->>'quantity')::INTEGER,
                part_item->>'unit',
                part_item->>'edge_banding',
                part_item->'metadata',
                'xml_promob',
                true -- Liberação industrial continua bloqueada por padrão
            );
            total_parts := total_parts + 1;
        END LOOP;
    END LOOP;

    -- Peças avulsas
    FOR part_item IN SELECT * FROM jsonb_array_elements(_loose_parts)
    LOOP
        INSERT INTO public.parts (
            project_id, name, kind, material, thickness_mm, width_mm, length_mm, 
            quantity, unit, edge_banding, metadata, data_source, machining_blocked
        ) VALUES (
            _project_id,
            part_item->>'name',
            part_item->>'kind',
            part_item->>'material',
            (part_item->>'thickness_mm')::NUMERIC,
            (part_item->>'width_mm')::NUMERIC,
            (part_item->>'length_mm')::NUMERIC,
            (part_item->>'quantity')::INTEGER,
            part_item->>'unit',
            part_item->>'edge_banding',
            part_item->'metadata',
            'xml_promob',
            true
        );
        total_parts := total_parts + 1;
    END LOOP;

    -- 2. Identificar Arquivos Fontes
    SELECT id INTO xml_file_id FROM public.project_files WHERE project_id = _project_id AND file_type = 'xml' LIMIT 1;
    SELECT id INTO dxf_file_id FROM public.project_files WHERE project_id = _project_id AND file_type = 'dxf_conferencia' LIMIT 1;
    SELECT id INTO listacorte_file_id FROM public.project_files WHERE project_id = _project_id AND file_type = 'lista_corte_pdf' LIMIT 1;
    SELECT id INTO listacompra_file_id FROM public.project_files WHERE project_id = _project_id AND file_type = 'lista_compra_pdf' LIMIT 1;
    SELECT id INTO cotas_file_id FROM public.project_files WHERE project_id = _project_id AND file_type = 'cotas_pdf' LIMIT 1;

    -- 3. Distribuição Automática
    -- Engenharia
    INSERT INTO public.project_distribution (project_id, area, source_type, source_file_id, status, item_count)
    VALUES (_project_id, 'engenharia', 'xml+cotas+dxf', xml_file_id, 'conferencia_pendente', total_parts);

    -- Corte
    IF listacorte_file_id IS NOT NULL THEN
        INSERT INTO public.project_distribution (project_id, area, source_type, source_file_id, status, item_count)
        VALUES (_project_id, 'corte', 'pdf_listacorte', listacorte_file_id, 'alimentado', total_parts);
    END IF;

    -- Compras
    IF listacompra_file_id IS NOT NULL THEN
        INSERT INTO public.project_distribution (project_id, area, source_type, source_file_id, status, item_count)
        VALUES (_project_id, 'compras', 'pdf_listacompra', listacompra_file_id, 'alimentado', total_parts);
    END IF;

    -- Montagem
    INSERT INTO public.project_distribution (project_id, area, source_type, source_file_id, status, item_count)
    VALUES (_project_id, 'montagem', 'desenhos+xml+dxf', cotas_file_id, 'alimentado', total_parts);

    -- 4. Atualizar Status do Projeto
    UPDATE public.projects 
    SET operational_status = 'alimentado',
        ingestion_completed_at = now(),
        distribution_completed_at = now()
    WHERE id = _project_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_and_distribute_project(UUID, UUID, JSONB, JSONB) TO authenticated;
