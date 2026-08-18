ALTER TABLE public.validation_checks ADD COLUMN IF NOT EXISTS evidence_file_id uuid;
ALTER TABLE public.validation_checks ADD COLUMN IF NOT EXISTS evidence_source text;

-- Garantir que as colunas sejam acessíveis
GRANT ALL ON public.validation_checks TO authenticated;
GRANT ALL ON public.validation_checks TO service_role;

NOTIFY pgrst, 'reload schema';
