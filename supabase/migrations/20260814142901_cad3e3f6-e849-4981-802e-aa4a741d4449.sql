
-- 1. Tabela de Etapas de Produção
CREATE TABLE public.production_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
    part_id uuid REFERENCES public.parts(id) ON DELETE CASCADE,
    step_type text NOT NULL, -- 'corte', 'usinagem', 'borda', 'separacao', 'montagem'
    status text NOT NULL DEFAULT 'pendente', -- 'pendente', 'em_andamento', 'concluido', 'bloqueado'
    operator_id uuid REFERENCES auth.users(id),
    notes text,
    started_at timestamptz,
    completed_at timestamptz,
    updated_at timestamptz DEFAULT now()
);

-- 2. Tabela de Grupos de Montagem
CREATE TABLE public.assembly_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    code text NOT NULL,
    name text,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Vincular peças a grupos de montagem
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS assembly_group_id uuid REFERENCES public.assembly_groups(id);

-- 3. Tabela de Expedição / Volumes
CREATE TABLE public.shipping_volumes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    description text NOT NULL,
    status text NOT NULL DEFAULT 'pendente', -- 'pendente', 'carregado', 'entregue'
    driver_name text,
    shipped_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Tabela de ligação entre módulos e volumes
CREATE TABLE public.shipping_volume_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    volume_id uuid REFERENCES public.shipping_volumes(id) ON DELETE CASCADE NOT NULL,
    module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL
);

-- 4. Logs de Produção e Rastreabilidade
CREATE TABLE public.production_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembly_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_volumes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_volume_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_logs TO authenticated;

GRANT ALL ON public.production_steps TO service_role;
GRANT ALL ON public.assembly_groups TO service_role;
GRANT ALL ON public.shipping_volumes TO service_role;
GRANT ALL ON public.shipping_volume_items TO service_role;
GRANT ALL ON public.production_logs TO service_role;

-- RLS
ALTER TABLE public.production_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_volume_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can access production steps of their company projects"
ON public.production_steps FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = production_steps.project_id));

CREATE POLICY "Users can access assembly groups of their company projects"
ON public.assembly_groups FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = assembly_groups.project_id));

CREATE POLICY "Users can access shipping volumes of their company projects"
ON public.shipping_volumes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = shipping_volumes.project_id));

CREATE POLICY "Users can access shipping volume items"
ON public.shipping_volume_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.shipping_volumes v WHERE v.id = shipping_volume_items.volume_id));

CREATE POLICY "Users can access production logs"
ON public.production_logs FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = production_logs.project_id));
