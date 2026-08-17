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

-- 2. Atualizar perfil do administrador principal
UPDATE public.profiles 
SET company_id = 'd4a15241-ea40-42d0-afad-97435ffc4cf0' 
WHERE id = 'aa36bd1d-d07a-4160-832d-cfca3e5f4ad7';

-- 3. Atualizar role para admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = 'aa36bd1d-d07a-4160-832d-cfca3e5f4ad7';

-- 4. Verificar visibilidade para esse usuário específico
SELECT p.id, p.name, p.company_id
FROM public.projects p
WHERE p.company_id = 'd4a15241-ea40-42d0-afad-97435ffc4cf0';