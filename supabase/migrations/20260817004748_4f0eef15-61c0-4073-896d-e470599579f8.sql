-- Create industrial operational status enum
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
            'finalizado',
            'assistencia'
        );
    END IF;
END$$;

-- Add operational status to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS operational_status public.project_operational_status DEFAULT 'recebido';

-- Create distribution table
CREATE TABLE IF NOT EXISTS public.project_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    area TEXT NOT NULL, -- comercial, compras, engenharia, corte, borda, usinagem, separacao, montagem, expedicao, assistencia
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, alimentado, liberado, bloqueado, conferencia_pendente
    item_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS and Grants
ALTER TABLE public.project_distribution ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_distribution TO authenticated;
GRANT ALL ON public.project_distribution TO service_role;

CREATE POLICY "Users can view distribution of their company projects"
ON public.project_distribution
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_distribution.project_id
        AND p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- RPC for Distribution
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
BEGIN
    -- Update project status to processando
    UPDATE public.projects 
    SET operational_status = 'processando',
        updated_at = now()
    WHERE id = _project_id;

    -- Process Modules
    FOR module_record IN SELECT * FROM jsonb_array_elements(_modules)
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
            id_xml
        )
        SELECT 
            _project_id,
            p.company_id,
            (module_record.value->>'name'),
            (module_record.value->>'environment'),
            (module_record.value->>'width_mm')::NUMERIC,
            (module_record.value->>'height_mm')::NUMERIC,
            (module_record.value->>'depth_mm')::NUMERIC,
            (module_record.value->>'quantity')::INTEGER,
            (module_record.value->>'id_xml')
        FROM public.projects p
        WHERE p.id = _project_id
        RETURNING id INTO new_module_id;

        -- Process Parts for this module
        FOR part_record IN SELECT * FROM jsonb_array_elements(module_record.value->'parts')
        LOOP
            INSERT INTO public.parts (
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
                machining_blocked -- Standard lock
            )
            SELECT 
                new_module_id,
                p.company_id,
                (part_record.value->>'name'),
                (part_record.value->>'kind')::public.part_kind,
                (part_record.value->>'material'),
                (part_record.value->>'thickness_mm')::NUMERIC,
                (part_record.value->>'width_mm')::NUMERIC,
                (part_record.value->>'length_mm')::NUMERIC,
                (part_record.value->>'quantity')::INTEGER,
                COALESCE(part_record.value->>'unit', 'un'),
                (part_record.value->>'edge_banding'),
                (part_record.value->'metadata'),
                TRUE -- Ingestion starts locked
            FROM public.projects p
            WHERE p.id = _project_id;
        END LOOP;
    END LOOP;

    -- Update distribution records
    INSERT INTO public.project_distribution (project_id, area, status, item_count)
    VALUES 
        (_project_id, 'engenharia', 'alimentado', jsonb_array_length(_modules)),
        (_project_id, 'corte', 'conferencia_pendente', (SELECT count(*) FROM public.parts pt JOIN public.modules m ON pt.module_id = m.id WHERE m.project_id = _project_id)),
        (_project_id, 'borda', 'conferencia_pendente', (SELECT count(*) FROM public.parts pt JOIN public.modules m ON pt.module_id = m.id WHERE m.project_id = _project_id AND pt.edge_banding IS NOT NULL)),
        (_project_id, 'usinagem', 'bloqueado', (SELECT count(*) FROM public.parts pt JOIN public.modules m ON pt.module_id = m.id WHERE m.project_id = _project_id)),
        (_project_id, 'comercial', 'alimentado', 1);

    -- Set final status to alimentado
    UPDATE public.projects 
    SET operational_status = 'alimentado',
        updated_at = now()
    WHERE id = _project_id;
END;
$$;