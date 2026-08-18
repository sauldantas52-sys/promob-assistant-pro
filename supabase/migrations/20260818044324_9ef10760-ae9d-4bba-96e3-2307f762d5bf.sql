ALTER TABLE public.validation_checks ADD COLUMN IF NOT EXISTS evidence_file_id uuid;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.validation_checks TO authenticated;
GRANT ALL ON public.validation_checks TO service_role;
COMMENT ON COLUMN public.validation_checks.evidence_file_id IS 'ID do arquivo de evidência anexado à validação industrial.';