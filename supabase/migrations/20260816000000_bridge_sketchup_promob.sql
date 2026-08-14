-- Tabela de Versões de Projetos (Extensão)
CREATE TABLE public.project_versions (
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
CREATE TABLE public.project_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid REFERENCES public.project_versions(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    code text NOT NULL, -- 00, 01, 02...
    color text,
    company_id uuid REFERENCES public.companies(id) NOT NULL
);

-- Tabela de Comparações SketchUp x Promob
CREATE TABLE public.project_comparisons (
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

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_versions TO authenticated;
GRANT ALL ON public.project_versions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tags TO authenticated;
GRANT ALL ON public.project_tags TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_comparisons TO authenticated;
GRANT ALL ON public.project_comparisons TO service_role;

-- RLS
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage versions of their company" ON public.project_versions
    FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage tags of their company" ON public.project_tags
    FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage comparisons of their company" ON public.project_comparisons
    FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Registro inicial de tags padronizadas (Helper)
CREATE OR REPLACE FUNCTION public.seed_default_tags(v_id uuid, c_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.project_tags (version_id, company_id, code, name) VALUES
    (v_id, c_id, '00', 'REFERENCIAS'),
    (v_id, c_id, '01', 'AMBIENTES'),
    (v_id, c_id, '02', 'MODULOS'),
    (v_id, c_id, '03', 'G1'),
    (v_id, c_id, '04', 'G2'),
    (v_id, c_id, '05', 'G3'),
    (v_id, c_id, '06', 'AV'),
    (v_id, c_id, '07', 'PORTAS_FRENTES'),
    (v_id, c_id, '08', 'ESTRUTURA'),
    (v_id, c_id, '09', 'INTERNOS'),
    (v_id, c_id, '10', 'FERRAGENS_VISUAIS'),
    (v_id, c_id, '11', 'COTAS'),
    (v_id, c_id, '12', 'MATERIAIS'),
    (v_id, c_id, '13', 'NAO_FABRICAVEL'),
    (v_id, c_id, '14', 'PROCESSO_CORTE'),
    (v_id, c_id, '15', 'PROCESSO_BORDA'),
    (v_id, c_id, '16', 'PROCESSO_USINAGEM'),
    (v_id, c_id, '17', 'PROCESSO_SEPARACAO'),
    (v_id, c_id, '18', 'MONTAGEM');
END;
$$;
