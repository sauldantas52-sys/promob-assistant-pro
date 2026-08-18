-- 1. Função para salvar o plano oficial e desativar anteriores
CREATE OR REPLACE FUNCTION public.save_official_cut_plan(
    p_project_id uuid,
    p_company_id uuid,
    p_source text,
    p_total_pieces integer,
    p_total_sheets integer,
    p_total_cuts integer,
    p_utilization_percent numeric,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan_id uuid;
BEGIN
    -- Se for marcar como oficial, desativar outros do mesmo projeto
    IF p_source = 'cutpro_oficial' THEN
        UPDATE public.cut_plans
        SET is_official = false
        WHERE project_id = p_project_id;
    END IF;

    -- Inserir o novo plano
    INSERT INTO public.cut_plans (
        project_id,
        company_id,
        source,
        is_official,
        total_pieces,
        total_sheets,
        total_cuts,
        utilization_percent,
        metadata,
        created_by
    ) VALUES (
        p_project_id,
        p_company_id,
        p_source,
        (p_source = 'cutpro_oficial'),
        p_total_pieces,
        p_total_sheets,
        p_total_cuts,
        p_utilization_percent,
        p_metadata,
        auth.uid()
    )
    RETURNING id INTO v_plan_id;

    -- Atualizar o status do projeto
    IF p_source = 'cutpro_oficial' THEN
        UPDATE public.projects
        SET cutting_status = 'pronto',
            updated_at = now()
        WHERE id = p_project_id;
    END IF;

    RETURN v_plan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_official_cut_plan TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_official_cut_plan TO service_role;

-- 2. Garantir que as tabelas existam (reforço da Fidelity 4.0)
CREATE TABLE IF NOT EXISTS public.cut_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    source text CHECK (source IN ('estimativa', 'cutpro_oficial')),
    is_official boolean DEFAULT false,
    total_pieces integer,
    total_sheets integer,
    total_cuts integer,
    utilization_percent numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.cut_sheets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cut_plan_id uuid NOT NULL REFERENCES public.cut_plans(id) ON DELETE CASCADE,
    sheet_index integer NOT NULL,
    material text,
    thickness_mm numeric,
    color text,
    width_mm numeric,
    length_mm numeric,
    usable_width_mm numeric,
    usable_length_mm numeric,
    utilization_percent numeric,
    placements jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- RLS & Grants
ALTER TABLE public.cut_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cut_sheets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage cut_plans of their company' AND tablename = 'cut_plans') THEN
        CREATE POLICY "Users can manage cut_plans of their company" ON public.cut_plans
            FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage cut_sheets through cut_plan' AND tablename = 'cut_sheets') THEN
        CREATE POLICY "Users can manage cut_sheets through cut_plan" ON public.cut_sheets
            FOR ALL TO authenticated USING (
                EXISTS (
                    SELECT 1 FROM public.cut_plans cp 
                    WHERE cp.id = cut_plan_id 
                    AND cp.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
                )
            );
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cut_plans TO authenticated;
GRANT ALL ON public.cut_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cut_sheets TO authenticated;
GRANT ALL ON public.cut_sheets TO service_role;
