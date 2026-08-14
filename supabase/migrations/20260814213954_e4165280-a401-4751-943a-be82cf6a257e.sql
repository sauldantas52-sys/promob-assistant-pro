-- Transação de migração de dados
BEGIN;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machining_blocked BOOLEAN DEFAULT true;
UPDATE public.projects SET machining_blocked = is_machining_assembly_blocked;
COMMIT;
