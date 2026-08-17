-- 1. Restaurar permissão de execução da função has_role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2. Garantir privilégios básicos nas tabelas industriais
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.project_files TO authenticated;
GRANT SELECT ON public.modules TO authenticated;
GRANT SELECT ON public.parts TO authenticated;
GRANT SELECT ON public.validation_checks TO authenticated;

-- 3. Recriar Políticas RLS para evitar recursão e erro 42501
-- Projetos: Usuário vê projetos da sua empresa
DROP POLICY IF EXISTS "Users view their company projects" ON public.projects;
CREATE POLICY "Users view their company projects" 
ON public.projects 
FOR SELECT 
TO authenticated 
USING (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Módulos: Relacionados a projetos da empresa
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

-- Peças: Relacionadas a projetos da empresa
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

-- Arquivos: Relacionados a projetos da empresa
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

-- 4. Audit final: Tentar localizar "Closet" e "Amanda" novamente para confirmar persistência
SELECT id, name, company_id FROM public.projects WHERE name ILIKE '%amanda%' OR name ILIKE '%closet%';