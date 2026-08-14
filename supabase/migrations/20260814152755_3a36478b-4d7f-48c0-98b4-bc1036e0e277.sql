ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS cutting_edge_released BOOLEAN DEFAULT false;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS machining_blocked BOOLEAN DEFAULT true;

-- Garantir acesso
GRANT SELECT, UPDATE ON public.parts TO authenticated;
