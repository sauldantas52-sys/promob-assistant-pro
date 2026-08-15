-- Add is_completed column to modules and parts
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Grant access
GRANT UPDATE(is_completed) ON public.modules TO authenticated;
GRANT UPDATE(is_completed) ON public.parts TO authenticated;

-- Ensure service_role has all
GRANT ALL ON public.modules TO service_role;
GRANT ALL ON public.parts TO service_role;
