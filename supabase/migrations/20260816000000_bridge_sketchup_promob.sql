-- Tabela de Versões de Projetos (Extensão)
CREATE TABLE IF NOT EXISTS public.project_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    version_number integer NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    skp_file_url text,
    xml_file_url text,
    pdf_file_url text,
    thumbnail_url text,
    status text DEFAULT 'rascunho',
    is_active boolean DEFAULT true,
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- Tabela de Tags/Layers Padronizadas
CREATE TABLE IF NOT EXISTS public.project_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    code text NOT NULL, -- 00, 01, 02...
    color text,
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- Tabela de Comparações SketchUp x Promob
CREATE TABLE IF NOT EXISTS public.project_comparisons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    module_id_xml text,
    sketchup_guid text,
    status text NOT NULL DEFAULT 'divergente', -- 'match', 'divergente', 'sem_correspondencia'
    measurement_divergence jsonb, -- { width: diff, height: diff, depth: diff }
    material_divergence jsonb,
    thickness_divergence jsonb,
    is_approved boolean DEFAULT false,
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES auth.users(id),
    comments text,
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- Nova Tabela: Itens da Versão (necessária para processSkpPackage)
CREATE TABLE IF NOT EXISTS public.project_version_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    environment_id text,
    module_id text NOT NULL,
    group_code text,
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
    plugin_version text,
    engineering_status text DEFAULT 'não_confirmado',
    validation_notes text,
    tags text[],
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- Nova Tabela: Validações de Pacote
CREATE TABLE IF NOT EXISTS public.project_package_validations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    status text,
    error_code text,
    message text,
    item_id text,
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- Nova Tabela: Arquivos da Versão
CREATE TABLE IF NOT EXISTS public.project_version_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    file_type text,
    file_url text,
    file_name text,
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- Permissões (ESSENCIAL)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_versions TO authenticated;
GRANT ALL ON public.project_versions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tags TO authenticated;
GRANT ALL ON public.project_tags TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_comparisons TO authenticated;
GRANT ALL ON public.project_comparisons TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_version_items TO authenticated;
GRANT ALL ON public.project_version_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_package_validations TO authenticated;
GRANT ALL ON public.project_package_validations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_version_files TO authenticated;
GRANT ALL ON public.project_version_files TO service_role;

-- RLS
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_version_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_package_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_version_files ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can manage versions of their company" ON public.project_versions;
DROP POLICY IF EXISTS "Users can manage tags of their company" ON public.project_tags;
DROP POLICY IF EXISTS "Users can manage comparisons of their company" ON public.project_comparisons;
DROP POLICY IF EXISTS "Users can manage version items of their company" ON public.project_version_items;
DROP POLICY IF EXISTS "Users can manage package validations of their company" ON public.project_package_validations;
DROP POLICY IF EXISTS "Users can manage version files of their company" ON public.project_version_files;
CREATE POLICY "Users can manage versions of their company" ON public.project_versions FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage tags of their company" ON public.project_tags FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage comparisons of their company" ON public.project_comparisons FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage version items of their company" ON public.project_version_items FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage package validations of their company" ON public.project_package_validations FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage version files of their company" ON public.project_version_files FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
