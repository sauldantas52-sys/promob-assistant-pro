ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS storage_location TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assembly_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assembly_notes TEXT;
GRANT ALL ON public.parts TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.shipping_volumes TO authenticated;