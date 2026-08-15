-- 1. Padronizar a tabela 'projects'
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'is_machining_assembly_blocked') THEN
    -- Criar a nova coluna se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'machining_blocked') THEN
      ALTER TABLE public.projects ADD COLUMN machining_blocked BOOLEAN DEFAULT true;
    END IF;
    
    -- Migrar dados
    UPDATE public.projects SET machining_blocked = is_machining_assembly_blocked WHERE machining_blocked IS NULL;
    
    -- Remover a coluna antiga (após garantir que o código foi atualizado em uma transação real, 
    -- mas aqui faremos a migração de dados e manteremos a coluna por segurança no piloto se necessário, 
    -- porém a instrução pede para migrar para machining_blocked).
    -- ALTER TABLE public.projects DROP COLUMN is_machining_assembly_blocked;
  END IF;
END $$;

-- 2. Garantir que a tabela 'parts' tem o campo correto
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'machining_blocked') THEN
    ALTER TABLE public.parts ADD COLUMN machining_blocked BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 3. Garantir permissões
GRANT SELECT, UPDATE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.parts TO authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.parts TO service_role;
