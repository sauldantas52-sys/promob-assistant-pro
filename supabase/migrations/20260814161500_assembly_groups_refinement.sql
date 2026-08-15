-- Refinamento do conceito de Grupos de Montagem (Módulos/Conjuntos)
-- Cada grupo representa um módulo físico com rastreabilidade total.

-- 1. Expandir a tabela de assembly_groups com os campos necessários
ALTER TABLE public.assembly_groups 
ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS storage_location text,
ADD COLUMN IF NOT EXISTS separation_status text DEFAULT 'pendente', -- 'pendente', 'em_andamento', 'concluido'
ADD COLUMN IF NOT EXISTS conference_status text DEFAULT 'pendente', -- 'pendente', 'em_andamento', 'concluido'
ADD COLUMN IF NOT EXISTS loading_status text DEFAULT 'pendente',    -- 'pendente', 'carregado'
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS lock_reason text,
ADD COLUMN IF NOT EXISTS exception_authorized_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS exception_justification text,
ADD COLUMN IF NOT EXISTS sealed_at timestamptz,
ADD COLUMN IF NOT EXISTS sealed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Tabela para rastreabilidade de ferragens por grupo (Kit de Ferragens)
CREATE TABLE IF NOT EXISTS public.assembly_group_hardware (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES public.assembly_groups(id) ON DELETE CASCADE NOT NULL,
    part_id uuid REFERENCES public.parts(id) ON DELETE CASCADE NOT NULL,
    quantity_required numeric NOT NULL,
    quantity_confirmed numeric DEFAULT 0,
    status text DEFAULT 'pendente', -- 'pendente', 'separado', 'conferido'
    created_at timestamptz DEFAULT now()
);

-- 3. Tabela para conferência individual de itens do grupo (Escanear cada peça)
CREATE TABLE IF NOT EXISTS public.assembly_group_items_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES public.assembly_groups(id) ON DELETE CASCADE NOT NULL,
    item_type text NOT NULL, -- 'peca_chapa', 'peca_usinada', 'ferragem', 'acessorio'
    item_id uuid NOT NULL,
    scanned_at timestamptz DEFAULT now(),
    scanned_by uuid REFERENCES auth.users(id),
    location text
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembly_group_hardware TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembly_group_items_log TO authenticated;
GRANT ALL ON public.assembly_group_hardware TO service_role;
GRANT ALL ON public.assembly_group_items_log TO service_role;

-- RLS
ALTER TABLE public.assembly_group_hardware ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_group_items_log ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can manage hardware of their company groups" ON public.assembly_group_hardware;
CREATE POLICY "Users can manage hardware of their company groups"
ON public.assembly_group_hardware FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.assembly_groups g WHERE g.id = assembly_group_hardware.group_id));

DROP POLICY IF EXISTS "Users can manage items log of their company groups" ON public.assembly_group_items_log;
CREATE POLICY "Users can manage items log of their company groups"
ON public.assembly_group_items_log FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.assembly_groups g WHERE g.id = assembly_group_items_log.group_id));
