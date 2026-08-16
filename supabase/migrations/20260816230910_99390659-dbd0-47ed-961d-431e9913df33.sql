-- Adicionando coluna metadata à tabela parts
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Garantir que as permissões estejam corretas
GRANT ALL ON public.parts TO authenticated;
GRANT ALL ON public.parts TO service_role;
