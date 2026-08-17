-- 1. Restaurar permissões da função has_role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

-- 2. Garantir acesso às tabelas base para autenticados
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.project_files TO authenticated;
GRANT SELECT ON public.modules TO authenticated;
GRANT SELECT ON public.parts TO authenticated;
GRANT SELECT ON public.validation_checks TO authenticated;

-- 3. Corrigir políticas RLS que usam current_company_id() ou subqueries circulares
-- Vamos simplificar a política de visualização de projetos para evitar recursividade
DROP POLICY IF EXISTS "Users view their company projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects of their company" ON public.projects;

CREATE POLICY "Users view their company projects" 
ON public.projects 
FOR SELECT 
TO authenticated 
USING (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Corrigir módulos
DROP POLICY IF EXISTS "Company members manage modules" ON public.modules;
CREATE POLICY "Company members manage modules" 
ON public.modules 
FOR ALL 
TO authenticated 
USING (
    project_id IN (
        SELECT id FROM public.projects WHERE company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

-- Corrigir peças
DROP POLICY IF EXISTS "Company members manage parts" ON public.parts;
CREATE POLICY "Company members manage parts" 
ON public.parts 
FOR ALL 
TO authenticated 
USING (
    project_id IN (
        SELECT id FROM public.projects WHERE company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

-- Corrigir arquivos
DROP POLICY IF EXISTS "Company members manage project files" ON public.project_files;
CREATE POLICY "Company members manage project files" 
ON public.project_files 
FOR ALL 
TO authenticated 
USING (
    project_id IN (
        SELECT id FROM public.projects WHERE company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);