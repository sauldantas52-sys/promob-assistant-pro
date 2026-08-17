-- 1. Ampliação da Tabela parts
ALTER TABLE public.parts 
ADD COLUMN IF NOT EXISTS id_xml text,
ADD COLUMN IF NOT EXISTS parent_id_xml text,
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS supplier text,
ADD COLUMN IF NOT EXISTS edge_top numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS edge_bottom numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS edge_left numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS edge_right numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS edge_name_general text,
ADD COLUMN IF NOT EXISTS edge_name_front text,
ADD COLUMN IF NOT EXISTS piece_code text,
ADD COLUMN IF NOT EXISTS module_sequence integer,
ADD COLUMN IF NOT EXISTS piece_sequence integer,
ADD COLUMN IF NOT EXISTS repetition integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS quantity_raw numeric;

-- 2. Ampliação da Tabela modules
ALTER TABLE public.modules
ADD COLUMN IF NOT EXISTS id_xml text,
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS sequence integer;

-- 3. Criação da Tabela cut_plans
CREATE TABLE IF NOT EXISTS public.cut_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    source text CHECK (source IN ('estimativa', 'cutpro_oficial')),
    sheet_width_mm numeric,
    sheet_height_mm numeric,
    kerf_mm numeric DEFAULT 4,
    trim_mm numeric,
    total_pieces integer,
    total_sheets integer,
    total_cuts integer,
    utilization_percent numeric,
    is_official boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cut_plans TO authenticated;
GRANT ALL ON public.cut_plans TO service_role;
ALTER TABLE public.cut_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cut_plans of their company" ON public.cut_plans
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Criação da Tabela cut_sheets
CREATE TABLE IF NOT EXISTS public.cut_sheets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cut_plan_id uuid NOT NULL REFERENCES public.cut_plans(id) ON DELETE CASCADE,
    sheet_number integer,
    material text,
    color text,
    thickness_mm numeric,
    utilization_percent numeric,
    placements jsonb,
    remainders jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cut_sheets TO authenticated;
GRANT ALL ON public.cut_sheets TO service_role;
ALTER TABLE public.cut_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cut_sheets through cut_plan" ON public.cut_sheets
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.cut_plans cp 
        JOIN public.profiles p ON cp.company_id = p.company_id
        WHERE cp.id = cut_plan_id AND p.id = auth.uid()
    ));

-- 5. Criação da Tabela label_settings
CREATE TABLE IF NOT EXISTS public.label_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    preset text,
    settings jsonb,
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_settings TO authenticated;
GRANT ALL ON public.label_settings TO service_role;
ALTER TABLE public.label_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage label_settings of their company" ON public.label_settings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 6. Criação da Tabela budgets
CREATE TABLE IF NOT EXISTS public.budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    source_file text,
    analysis_mode text CHECK (analysis_mode IN ('ia_online', 'ocr_local', 'manual')),
    confidence integer,
    status text,
    total_value numeric,
    raw_ai_response jsonb,
    metadata jsonb DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budgets of their company" ON public.budgets
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 7. Criação da Tabela budget_items
CREATE TABLE IF NOT EXISTS public.budget_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    category text CHECK (category IN ('modulo', 'material', 'ferragem', 'servico', 'outro')),
    name text,
    quantity numeric,
    unit text,
    unit_price numeric,
    total_price numeric,
    source text,
    confidence integer,
    is_confirmed boolean DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_items TO authenticated;
GRANT ALL ON public.budget_items TO service_role;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budget_items through budget" ON public.budget_items
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.budgets b
        JOIN public.profiles p ON b.company_id = p.company_id
        WHERE b.id = budget_id AND p.id = auth.uid()
    ));

