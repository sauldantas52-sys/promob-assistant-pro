
-- Assegurar que usuários autenticados possam criar sua própria empresa e perfil durante o onboarding
DROP POLICY IF EXISTS "Enable insert for authenticated users during setup" ON public.companies;
CREATE POLICY "Enable insert for authenticated users during setup" ON public.companies 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable insert for users to own profile" ON public.profiles;
CREATE POLICY "Enable insert for users to own profile" ON public.profiles 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Enable insert for users to own roles" ON public.user_roles;
CREATE POLICY "Enable insert for users to own roles" ON public.user_roles 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable select for all authenticated users" ON public.companies;
CREATE POLICY "Enable select for all authenticated users" ON public.companies
    FOR SELECT TO authenticated
    USING (true);

-- Habilitar leitura de perfis para permitir a política de empresas (que faz subquery em profiles)
DROP POLICY IF EXISTS "Users can view their profile" ON public.profiles;
CREATE POLICY "Users can view their profile" ON public.profiles 
    FOR SELECT TO authenticated 
    USING (id = auth.uid());

-- IMPORTANTE: A política original de SELECT em companies usava uma subquery que falhava se o perfil ainda não existisse.
-- Agora a política "Enable select for all authenticated users" resolve isso.
