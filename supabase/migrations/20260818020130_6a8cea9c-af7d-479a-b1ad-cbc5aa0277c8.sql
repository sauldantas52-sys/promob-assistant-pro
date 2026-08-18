-- 1. Restaurar privilégios críticos para o piloto
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_logs TO authenticated;
GRANT ALL ON public.production_steps TO service_role;
GRANT ALL ON public.production_logs TO service_role;

-- 2. Ativar Bloqueio Industrial no Projeto Piloto
UPDATE public.projects 
SET machining_blocked = true 
WHERE id = '5c5fce10-ba21-4b6e-952e-74543e835fb3';

-- 3. Garantir privilégios em outras tabelas industriais
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
