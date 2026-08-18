ALTER TABLE public.validation_checks ADD COLUMN IF NOT EXISTS evidence_source text;
COMMENT ON COLUMN public.validation_checks.evidence_source IS 'Origem da evidência (ex: promob_xml, technical_document, nesting_dxf).';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.validation_checks TO authenticated;
GRANT ALL ON public.validation_checks TO service_role;