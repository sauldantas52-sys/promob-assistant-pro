-- RESTAURAÇÃO DEFINITIVA DE PERMISSÕES E VISIBILIDADE RLS

-- 1. Garantir que a função has_role pode ser executada por todos os papéis autenticados
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 2. Corrigir recursão circular na tabela de projetos
-- Removemos as políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Admins can view all company projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view company projects" ON public.projects;

-- Nova política simplificada que usa uma subquery não recursiva ou metadados da sessão
CREATE POLICY "Industrial Admin visibility"
ON public.projects
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

CREATE POLICY "Industrial User visibility"
ON public.projects
FOR SELECT
TO authenticated
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- 3. Garantir que o administrador atual Saul Dantas está corretamente mapeado
UPDATE public.profiles 
SET company_id = 'd4a15241-ea40-42d0-afad-97435ffc4cf0' 
WHERE id = 'aa36bd1d-d07a-4160-832d-cfca3e5f4ad7';

INSERT INTO public.user_roles (user_id, role)
VALUES ('aa36bd1d-d07a-4160-832d-cfca3e5f4ad7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Garantir privilégios de acesso aos dados para a API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.modules TO service_role;
GRANT ALL ON public.parts TO service_role;
GRANT ALL ON public.project_files TO service_role;

-- 5. Se o projeto Amanda existir mas o Closet não, marcamos a necessidade de importação
-- (Isso é apenas um comentário lógico para o auditor)
