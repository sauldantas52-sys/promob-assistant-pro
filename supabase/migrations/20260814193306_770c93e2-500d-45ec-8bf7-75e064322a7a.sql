-- Ajuste da função com search_path seguro
CREATE OR REPLACE FUNCTION public.check_must_change_password(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT must_change_password 
  FROM public.profiles 
  WHERE id = _user_id;
$$;

-- Garantir que a tabela profiles tenha políticas RLS (se não houver)
-- O linter avisou sobre tabelas com RLS mas sem políticas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" 
        ON public.profiles FOR SELECT 
        TO authenticated 
        USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" 
        ON public.profiles FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = id);
    END IF;
END$$;
