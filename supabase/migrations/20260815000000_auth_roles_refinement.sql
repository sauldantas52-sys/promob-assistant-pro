-- 1. Atualizar o tipo app_role para incluir 'auditor'
-- Como Enums não podem ser alterados facilmente em transações, usamos este método seguro
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND enumlabel = 'auditor') THEN
        ALTER TYPE public.app_role ADD VALUE 'auditor';
    END IF;
END$$;

-- 2. Garantir permissões básicas para o auditor em tabelas operacionais
GRANT SELECT ON public.production_steps TO authenticated;
GRANT SELECT ON public.assembly_groups TO authenticated;
GRANT SELECT ON public.shipping_volumes TO authenticated;
GRANT SELECT ON public.production_logs TO authenticated;

-- 3. Atualizar a função has_role para ser usada em políticas
-- Já existe, mas vamos garantir que auditor possa ver logs
CREATE POLICY "Auditors can view all production logs" 
ON public.production_logs FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'auditor'));

CREATE POLICY "Auditors can view all projects" 
ON public.projects FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'auditor'));
