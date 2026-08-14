-- Add missing columns to production_logs if they were somehow missed or if we need to sync with the expected code structure
ALTER TABLE public.production_logs 
ADD COLUMN IF NOT EXISTS status_from text,
ADD COLUMN IF NOT EXISTS status_to text,
ADD COLUMN IF NOT EXISTS notes text;

-- Ensure RLS and Grants are correct
GRANT SELECT, INSERT ON public.production_logs TO authenticated;
GRANT ALL ON public.production_logs TO service_role;
