ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cutting_status TEXT DEFAULT 'pendente';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machining_status TEXT DEFAULT 'bloqueado';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_cutting_edge_released BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_machining_assembly_blocked BOOLEAN DEFAULT true;

-- Garantir que os campos sejam visíveis
GRANT SELECT, UPDATE ON public.projects TO authenticated;
