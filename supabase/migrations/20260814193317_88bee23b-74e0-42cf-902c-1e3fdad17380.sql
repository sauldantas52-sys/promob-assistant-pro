-- Corrigindo permissões de execução da função security definer
REVOKE EXECUTE ON FUNCTION public.check_must_change_password(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_must_change_password(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_must_change_password(uuid) TO service_role;

-- A função pode ser security invoker se o usuário autenticado já tiver permissão de leitura em profiles
CREATE OR REPLACE FUNCTION public.check_must_change_password(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT must_change_password 
  FROM public.profiles 
  WHERE id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.check_must_change_password(uuid) TO authenticated;
