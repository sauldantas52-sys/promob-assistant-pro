-- 1. Tabela de Itens da Versão SKP (Contrato de dados do plugin)
CREATE TABLE IF NOT EXISTS public.project_version_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    environment_id text, -- ID do Ambiente no SKP
    module_id text,      -- ID do Módulo no SKP (Unique ID/GUID)
    group_code text,     -- G1, G2, G3, AV...
    module_name text,
    material text,
    color text,
    thickness_mm numeric,
    width_mm numeric,
    height_mm numeric,
    depth_mm numeric,
    position_x numeric,
    position_y numeric,
    position_z numeric,
    source text DEFAULT 'sketchup',
    plugin_version text,
    engineering_status text DEFAULT 'pendente', -- 'pendente', 'confirmado', 'divergente', 'não_confirmado'
    validation_notes text,
    tags text[],
    created_at timestamptz DEFAULT now(),
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- 2. Tabela de Arquivos do Pacote SKP (Manifest, Miniaturas, Planta, Cotas)
CREATE TABLE IF NOT EXISTS public.project_version_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    file_type text NOT NULL, -- 'manifest', 'planta', 'cota', 'perspectiva', 'miniatura', 'validacao', 'skp'
    file_url text NOT NULL,
    file_name text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- 3. Tabela de Logs de Validação do Pacote
CREATE TABLE IF NOT EXISTS public.project_package_validations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL, -- 'sucesso', 'erro', 'aviso'
    error_code text,      -- 'MISSING_NAME', 'INVALID_MEASURE', 'DUPLICATE_GROUP', 'ORPHAN_OBJECT'
    message text NOT NULL,
    item_id text,         -- Referência ao module_id do SKP se aplicável
    created_at timestamptz DEFAULT now(),
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_version_items TO authenticated;
GRANT ALL ON public.project_version_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_version_files TO authenticated;
GRANT ALL ON public.project_version_files TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_package_validations TO authenticated;
GRANT ALL ON public.project_package_validations TO service_role;

-- RLS
ALTER TABLE public.project_version_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_version_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_package_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage version items of their company" ON public.project_version_items;
CREATE POLICY "Users can manage version items of their company" ON public.project_version_items
    FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage version files of their company" ON public.project_version_files;
CREATE POLICY "Users can manage version files of their company" ON public.project_version_files
    FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage validations of their company" ON public.project_package_validations;
CREATE POLICY "Users can manage validations of their company" ON public.project_package_validations
    FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
