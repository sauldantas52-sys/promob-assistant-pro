
-- 1. Fortalecer a função has_role para evitar recursão e garantir segurança
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
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

-- 2. Corrigir permissões de acesso às tabelas técnicas
GRANT SELECT ON public.modules TO authenticated;
GRANT SELECT ON public.parts TO authenticated;
GRANT SELECT ON public.production_steps TO authenticated;

-- 3. Atualizar políticas de RLS para módulos para garantir visibilidade por empresa
DROP POLICY IF EXISTS "Admins see all modules" ON public.modules;
DROP POLICY IF EXISTS "Company members manage modules" ON public.modules;

CREATE POLICY "Users see company modules" 
ON public.modules 
FOR SELECT 
TO authenticated 
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- 4. Atualizar políticas de RLS para peças
DROP POLICY IF EXISTS "Admins see all parts" ON public.parts;
DROP POLICY IF EXISTS "Company members manage parts" ON public.parts;

CREATE POLICY "Users see company parts" 
ON public.parts 
FOR SELECT 
TO authenticated 
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- 5. Garantir que a flag is_industrial_module exista (caso não tenha sido criada antes)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'modules' AND COLUMN_NAME = 'is_industrial_module') THEN
        ALTER TABLE public.modules ADD COLUMN is_industrial_module BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
