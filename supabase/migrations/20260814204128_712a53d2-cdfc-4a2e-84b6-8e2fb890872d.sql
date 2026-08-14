-- Re-applying the core bridge tables to the database.
-- Using CREATE TABLE because I suspect they were never actually committed or were dropped.

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

CREATE TABLE IF NOT EXISTS public.project_package_validations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    status text,
    error_code text,
    message text,
    item_id text,
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.project_version_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    file_type text,
    file_url text,
    file_name text,
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- Essential Grants for PostgREST visibility
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_versions TO authenticated;
GRANT ALL ON public.project_versions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_version_items TO authenticated;
GRANT ALL ON public.project_version_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_package_validations TO authenticated;
GRANT ALL ON public.project_package_validations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_version_files TO authenticated;
GRANT ALL ON public.project_version_files TO service_role;

-- RLS
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_version_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_package_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_version_files ENABLE ROW LEVEL SECURITY;

-- Basic company-based policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage versions of their company') THEN
        CREATE POLICY "Users can manage versions of their company" ON public.project_versions FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage version items of their company') THEN
        CREATE POLICY "Users can manage version items of their company" ON public.project_version_items FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;
