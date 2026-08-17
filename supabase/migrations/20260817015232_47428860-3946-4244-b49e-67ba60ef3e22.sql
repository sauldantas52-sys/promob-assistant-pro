-- 1. Restaurar permissões críticas
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.project_files TO authenticated;
GRANT SELECT ON public.modules TO authenticated;
GRANT SELECT ON public.parts TO authenticated;
GRANT SELECT ON public.validation_checks TO authenticated;

-- 2. Corrigir políticas RLS para evitar recursão circular (erro 42501)
-- Projetos
DROP POLICY IF EXISTS "Users view their company projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects of their company" ON public.projects;
CREATE POLICY "Users view their company projects" 
ON public.projects FOR SELECT TO authenticated 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Módulos
DROP POLICY IF EXISTS "Company members manage modules" ON public.modules;
CREATE POLICY "Company members manage modules" 
ON public.modules FOR ALL TO authenticated 
USING (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

-- Peças
DROP POLICY IF EXISTS "Company members manage parts" ON public.parts;
CREATE POLICY "Company members manage parts" 
ON public.parts FOR ALL TO authenticated 
USING (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

-- Arquivos
DROP POLICY IF EXISTS "Company members manage project files" ON public.project_files;
CREATE POLICY "Company members manage project files" 
ON public.project_files FOR ALL TO authenticated 
USING (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

-- 3. Identificar Projetos e Contagens Reais (Amanda 111 e busca pelo Closet)
SELECT 
    p.id, p.name, p.company_id,
    (SELECT count(*) FROM public.modules WHERE project_id = p.id) as modules,
    (SELECT count(*) FROM public.parts WHERE project_id = p.id) as parts,
    (SELECT count(*) FROM public.project_files WHERE project_id = p.id) as files
FROM public.projects p
WHERE p.name ILIKE '%amanda%' 
   OR p.name ILIKE '%closet%'
   OR (SELECT count(*) FROM public.parts WHERE project_id = p.id) > 10;

-- 4. Verificar visibilidade do administrador atual
SELECT id, company_id FROM public.profiles WHERE id = auth.uid();

-- 5. Status da função has_role
SELECT proname, has_function_privilege('authenticated', oid, 'execute') as auth_can_exec 
FROM pg_proc WHERE proname = 'has_role';