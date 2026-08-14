
-- Habilitar inserção inicial para configuração de conta
CREATE POLICY "Enable insert for authenticated users during setup" ON public.companies 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Enable insert for users to own profile" ON public.profiles 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for users to own roles" ON public.user_roles 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable select for all authenticated users" ON public.companies
    FOR SELECT TO authenticated
    USING (true);
