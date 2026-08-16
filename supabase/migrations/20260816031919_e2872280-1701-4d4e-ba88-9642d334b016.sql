DO $$
BEGIN
    -- assembly_group_hardware
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'assembly_group_hardware' AND schemaname = 'public') THEN
        ALTER TABLE public.assembly_group_hardware ENABLE ROW LEVEL SECURITY;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembly_group_hardware TO authenticated;
        GRANT ALL ON public.assembly_group_hardware TO service_role;
        DROP POLICY IF EXISTS "Company members manage assembly_group_hardware" ON public.assembly_group_hardware;
        CREATE POLICY "Company members manage assembly_group_hardware" ON public.assembly_group_hardware
        FOR ALL TO authenticated
        USING (
          group_id IN (
            SELECT id FROM public.assembly_groups 
            WHERE project_id IN (
              SELECT id FROM public.projects 
              WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
            )
          )
        );
    END IF;

    -- assembly_groups
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'assembly_groups' AND schemaname = 'public') THEN
        ALTER TABLE public.assembly_groups ENABLE ROW LEVEL SECURITY;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembly_groups TO authenticated;
        GRANT ALL ON public.assembly_groups TO service_role;
        DROP POLICY IF EXISTS "Company members manage assembly_groups" ON public.assembly_groups;
        CREATE POLICY "Company members manage assembly_groups" ON public.assembly_groups
        FOR ALL TO authenticated
        USING (
          project_id IN (
            SELECT id FROM public.projects 
            WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
          )
        );
    END IF;

    -- companies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'companies' AND schemaname = 'public') THEN
        ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.companies;
        DROP POLICY IF EXISTS "Users can only view their own company" ON public.companies;
        CREATE POLICY "Users can only view their own company" ON public.companies
        FOR SELECT TO authenticated
        USING (id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    -- production_logs
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'production_logs' AND schemaname = 'public') THEN
        ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_logs TO authenticated;
        GRANT ALL ON public.production_logs TO service_role;
        DROP POLICY IF EXISTS "Company members manage production_logs" ON public.production_logs;
        CREATE POLICY "Company members manage production_logs" ON public.production_logs
        FOR ALL TO authenticated
        USING (
          project_id IN (
            SELECT id FROM public.projects 
            WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
          )
        );
    END IF;

    -- production_steps
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'production_steps' AND schemaname = 'public') THEN
        ALTER TABLE public.production_steps ENABLE ROW LEVEL SECURITY;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_steps TO authenticated;
        GRANT ALL ON public.production_steps TO service_role;
        DROP POLICY IF EXISTS "Company members manage production_steps" ON public.production_steps;
        CREATE POLICY "Company members manage production_steps" ON public.production_steps
        FOR ALL TO authenticated
        USING (
          project_id IN (
            SELECT id FROM public.projects 
            WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
          )
        );
    END IF;
END $$;
