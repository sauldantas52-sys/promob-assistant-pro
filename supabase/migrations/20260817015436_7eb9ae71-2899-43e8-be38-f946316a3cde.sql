-- 1. Restaurar a função has_role com search_path seguro e permissões corretas
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

-- 2. Garantir privilégios básicos nas tabelas industriais
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.project_files TO authenticated;
GRANT SELECT ON public.modules TO authenticated;
GRANT SELECT ON public.parts TO authenticated;
GRANT SELECT ON public.validation_checks TO authenticated;

-- 3. Corrigir políticas RLS para evitar recursão circular (erro 42501)
DROP POLICY IF EXISTS "Users view their company projects" ON public.projects;
CREATE POLICY "Users view their company projects" 
ON public.projects FOR SELECT TO authenticated 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Company members manage modules" ON public.modules;
CREATE POLICY "Company members manage modules" 
ON public.modules FOR ALL TO authenticated 
USING (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Company members manage parts" ON public.parts;
CREATE POLICY "Company members manage parts" 
ON public.parts FOR ALL TO authenticated 
USING (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Company members manage project files" ON public.project_files;
CREATE POLICY "Company members manage project files" 
ON public.project_files FOR ALL TO authenticated 
USING (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

-- 4. VINCULAR O USUÁRIO LOGADO À EMPRESA DA AMANDA 111 PARA O TESTE
-- O usuário logado é 'aa36bd1d-d07a-4160-832d-cfca3e5f4ad7'
-- A empresa da Amanda é 'd4a15241-ea40-42d0-afad-97435ffc4cf0'
UPDATE public.profiles 
SET company_id = 'd4a15241-ea40-42d0-afad-97435ffc4cf0' 
WHERE id = 'aa36bd1d-d07a-4160-832d-cfca3e5f4ad7';

UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = 'aa36bd1d-d07a-4160-832d-cfca3e5f4ad7';

-- 5. Status final de visibilidade
SELECT p.id, p.name, p.company_id
FROM public.projects p
WHERE p.company_id IN (SELECT company_id FROM public.profiles WHERE id = 'aa36bd1d-d07a-4160-832d-cfca3e5f4ad7');