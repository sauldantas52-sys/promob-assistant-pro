-- 1. Alterar tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;

-- 2. Garantir permissões básicas para authenticated
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- 3. Função para verificar necessidade de troca de senha (segurança)
CREATE OR REPLACE FUNCTION public.check_must_change_password(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT must_change_password 
  FROM public.profiles 
  WHERE id = _user_id;
$$;
