-- 1. Restaurar a função has_role com search_path seguro e permissões absolutas
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
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 2. Garantir que as tabelas de segurança estejam visíveis para o motor RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles visibility" ON public.profiles;
CREATE POLICY "Public profiles visibility" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public roles visibility" ON public.user_roles;
CREATE POLICY "Public roles visibility" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- 3. Corrigir políticas de PROJETOS para usar a relação direta sem recursão
DROP POLICY IF EXISTS "Users view their company projects" ON public.projects;
CREATE POLICY "Users view their company projects" 
ON public.projects 
FOR SELECT 
TO authenticated 
USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. Corrigir políticas de módulos, peças e arquivos
DROP POLICY IF EXISTS "Company members manage modules" ON public.modules;
CREATE POLICY "Company members manage modules" 
ON public.modules FOR SELECT TO authenticated 
USING (
    project_id IN (
        SELECT id FROM public.projects WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Company members manage parts" ON public.parts;
CREATE POLICY "Company members manage parts" 
ON public.parts FOR SELECT TO authenticated 
USING (
    project_id IN (
        SELECT id FROM public.projects WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- 5. Vincular o administrador saul_dantas (aa36bd1d-d07a-4160-832d-cfca3e5f4ad7) à empresa da Amanda (d4a15241-ea40-42d0-afad-97435ffc4cf0)
UPDATE public.profiles 
SET company_id = 'd4a15241-ea40-42d0-afad-97435ffc4cf0' 
WHERE id = 'aa36bd1d-d07a-4160-832d-cfca3e5f4ad7';

INSERT INTO public.user_roles (user_id, role)
VALUES ('aa36bd1d-d07a-4160-832d-cfca3e5f4ad7', 'admin')
ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';

-- 6. Verificação final de visibilidade industrial
SELECT p.id, p.name, p.company_id, 
       (SELECT count(*) FROM public.modules WHERE project_id = p.id) as modules
FROM public.projects p
WHERE p.company_id = 'd4a15241-ea40-42d0-afad-97435ffc4cf0';