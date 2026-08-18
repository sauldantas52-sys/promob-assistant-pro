DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_steps' AND column_name = 'physical_id') THEN
        ALTER TABLE public.production_steps ADD COLUMN physical_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_steps' AND column_name = 'company_id') THEN
        ALTER TABLE public.production_steps ADD COLUMN company_id uuid REFERENCES public.companies(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_production_steps_physical_id ON public.production_steps(physical_id);
CREATE INDEX IF NOT EXISTS idx_production_steps_project_id ON public.production_steps(project_id);

ALTER TABLE public.production_steps ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_steps TO authenticated;
GRANT ALL ON public.production_steps TO service_role;

CREATE OR REPLACE FUNCTION public.initialize_production_tracking(
    p_project_id uuid,
    p_company_id uuid,
    p_steps jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_step RECORD;
BEGIN
    FOR v_step IN SELECT * FROM jsonb_to_recordset(p_steps) AS x(physicalId text, partId uuid, moduleId uuid)
    LOOP
        INSERT INTO production_steps (project_id, company_id, part_id, module_id, physical_id, step_type, status)
        VALUES (p_project_id, p_company_id, v_step.partId, v_step.moduleId, v_step.physicalId, 'corte', 'pendente')
        ON CONFLICT DO NOTHING;

        INSERT INTO production_steps (project_id, company_id, part_id, module_id, physical_id, step_type, status)
        VALUES (p_project_id, p_company_id, v_step.partId, v_step.moduleId, v_step.physicalId, 'borda', 'pendente')
        ON CONFLICT DO NOTHING;

        INSERT INTO production_steps (project_id, company_id, part_id, module_id, physical_id, step_type, status)
        VALUES (p_project_id, p_company_id, v_step.partId, v_step.moduleId, v_step.physicalId, 'usinagem', 'pendente')
        ON CONFLICT DO NOTHING;

        INSERT INTO production_steps (project_id, company_id, part_id, module_id, physical_id, step_type, status)
        VALUES (p_project_id, p_company_id, v_step.partId, v_step.moduleId, v_step.physicalId, 'separacao', 'pendente')
        ON CONFLICT DO NOTHING;

        INSERT INTO production_steps (project_id, company_id, part_id, module_id, physical_id, step_type, status)
        VALUES (p_project_id, p_company_id, v_step.partId, v_step.moduleId, v_step.physicalId, 'montagem', 'pendente')
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;